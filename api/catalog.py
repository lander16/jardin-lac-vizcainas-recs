import json
import os
import unicodedata
import re
from collections import defaultdict
from rapidfuzz import fuzz

def normalize_text(text):
    """
    Normalize text by removing accents (diacritics), converting to lowercase, 
    and returning a clean string for text matching.
    """
    if not text:
        return ""
    normalized = unicodedata.normalize('NFD', text)
    return "".join(c for c in normalized if unicodedata.category(c) != 'Mn').lower()

def clean_words(text):
    """
    Clean the target text by replacing all punctuation and symbols with spaces,
    then split it into individual words. This prevents trailing punctuation (like commas 
    or brackets) from interfering with word similarity calculations.
    """
    if not text:
        return []
    cleaned = re.sub(r'[^\w\s]', ' ', text)
    return cleaned.split()

def calculate_word_match_score(query_words, target_text):
    """
    Calculate a word-level token averaging similarity score between a list of query words
    and a target text string. 
    
    For each word in the query:
      1. We find its best matching counterpart among all words in the target text.
      2. If the query word is a prefix of a target word (and length >= 4), we assign a high score
         (100.0) penalized slightly by the length difference to avoid overly generic matches.
      3. Otherwise, we fall back to standard Levenshtein ratio (fuzz.ratio).
    
    The final score is the mathematical average of the best matches for each query word.
    This effectively eliminates false positives from multi-term queries where one word is a complete miss.
    """
    if not target_text:
        return 0.0
    target_words = clean_words(target_text)
    if not target_words:
        return 0.0
    
    total_score = 0.0
    for qw in query_words:
        best_word_score = 0.0
        for tw in target_words:
            # Check if query word is a prefix of target word
            if tw.startswith(qw) and len(qw) >= 4:
                # Apply length penalty: -5 points for every character difference
                score = 100.0 - (len(tw) - len(qw)) * 5
            else:
                score = fuzz.ratio(qw, tw)
            
            if score > best_word_score:
                best_word_score = score
        total_score += best_word_score
        
    return total_score / len(query_words)


class CatalogEngine:
    def __init__(self, data_dir="data/koha"):
        self.data_dir = data_dir
        self.graph_path = os.path.join(data_dir, "authority_graph.json")

        self.books = {}
        self.authorities = []
        self.connections = []
        self.top_authorities = []
        self.stats = {}

        # Indexes for fast lookup
        self.auth_index = {}          # authority_id → authority dict
        self.book_connections = {}    # biblio_id → list of (other_bid, weight, shared_auths)
        self.auth_to_books = {}      # authority_id → list of biblio_ids

        self.load_data()

    def load_data(self):
        """Load precomputed authority graph data."""
        if not os.path.exists(self.graph_path):
            print(f"WARNING: {self.graph_path} not found. Catalog features will be empty.")
            return

        with open(self.graph_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        def translate_type(t):
            if t == "Corporativo":
                return "Institución / Organización"
            if t == "Tema (Corporativo)":
                return "Tema (Institución)"
            return t

        self.books = data.get("books", {})
        for bid, book in self.books.items():
            for auth in book.get("authorities", []):
                auth["type"] = translate_type(auth.get("type", ""))

        self.authorities = data.get("authorities", [])
        for auth in self.authorities:
            auth["type"] = translate_type(auth.get("type", ""))

        self.connections = data.get("connections", [])

        self.top_authorities = data.get("top_authorities", [])
        for auth in self.top_authorities:
            auth["type"] = translate_type(auth.get("type", ""))

        self.stats = data.get("stats", {})
        if "type_counts" in self.stats:
            new_counts = {}
            for t, count in self.stats["type_counts"].items():
                new_counts[translate_type(t)] = count
            self.stats["type_counts"] = new_counts

        # Build authority index
        for auth in self.authorities:
            self.auth_index[auth["authority_id"]] = auth
            self.auth_to_books[auth["authority_id"]] = auth.get("biblio_ids", [])

        # Build search index for rapidfuzz matching
        self.search_index = []
        for bid, book in self.books.items():
            norm_auths = []
            for auth in book.get("authorities", []):
                norm_auths.append({
                    "name": auth["name"],
                    "norm_name": normalize_text(auth["name"]),
                    "type": auth["type"]
                })
            self.search_index.append({
                "biblio_id": bid,
                "norm_title": normalize_text(book.get("title", "")),
                "norm_author": normalize_text(book.get("author", "")),
                "authorities": norm_auths
            })

        # Build book connections index
        self.book_connections = defaultdict(list)
        for conn in self.connections:
            src = conn["source"]
            tgt = conn["target"]
            shared_ids = conn.get("shared_authority_ids", [])
            weight = conn["weight"]

            # Reconstruct shared_authorities list of dicts using auth_index
            shared = []
            for aid in shared_ids:
                auth = self.auth_index.get(aid)
                if auth:
                    shared.append({
                        "authority_id": aid,
                        "name": auth["name"],
                        "type": auth["type"],
                    })

            self.book_connections[src].append({
                "biblio_id": tgt,
                "weight": weight,
                "shared_authorities": shared,
            })
            self.book_connections[tgt].append({
                "biblio_id": src,
                "weight": weight,
                "shared_authorities": shared,
            })

        # Sort connections by weight descending
        for bid in self.book_connections:
            self.book_connections[bid].sort(key=lambda x: -x["weight"])

        # Calculate advanced stats
        orphaned_books = []
        for bid, book in self.books.items():
            if bid not in self.book_connections:
                orphaned_books.append({
                    "biblio_id": bid,
                    "title": book["title"],
                    "author": book["author"],
                })

        most_connected = []
        for bid, conns in self.book_connections.items():
            book = self.books.get(bid)
            if book:
                most_connected.append({
                    "biblio_id": bid,
                    "title": book["title"],
                    "author": book["author"],
                    "connection_count": len(conns),
                })
        most_connected.sort(key=lambda x: -x["connection_count"])

        total_conns_sum = sum(len(conns) for conns in self.book_connections.values())
        avg_conns = total_conns_sum / len(self.books) if self.books else 0

        # Calculate new metrics
        total_authority_links = sum(len(b["authorities"]) for b in self.books.values())
        avg_auths_per_book = round(total_authority_links / len(self.books), 2) if self.books else 0
        avg_books_per_auth = round(total_authority_links / len(self.authorities), 2) if self.authorities else 0
        pct_connected = round(((len(self.books) - len(orphaned_books)) / len(self.books)) * 100, 2) if self.books else 0

        # Calculate type-specific statistics
        type_stats = {}
        auths_by_type = defaultdict(list)
        for auth in self.authorities:
            auths_by_type[auth["type"]].append(auth)

        for t, auths in auths_by_type.items():
            total_auths = len(auths)
            total_links = sum(a["book_count"] for a in auths)
            avg_books = round(total_links / total_auths, 2) if total_auths else 0
            sorted_auths = sorted(auths, key=lambda a: -a["book_count"])
            top_auth = sorted_auths[0] if sorted_auths else None
            type_stats[t] = {
                "total_authorities": total_auths,
                "total_links": total_links,
                "avg_books_per_authority": avg_books,
                "top_authority_name": top_auth["name"] if top_auth else "",
                "top_authority_count": top_auth["book_count"] if top_auth else 0
            }

        # Connection weight distribution
        weight_dist = defaultdict(int)
        for conn in self.connections:
            w = conn["weight"]
            weight_dist[w] += 1

        # Update stats dict with 100 elements for list slices
        self.stats.update({
            "orphaned_books_count": len(orphaned_books),
            "sample_orphaned_books": orphaned_books[:100],  # Increased to 100
            "most_connected_books": most_connected[:100],    # Increased to 100
            "avg_connections_per_book": round(avg_conns, 2),
            "total_authority_links": total_authority_links,
            "avg_authorities_per_book": avg_auths_per_book,
            "avg_books_per_authority": avg_books_per_auth,
            "percentage_connected_catalog": pct_connected,
            "weight_distribution": dict(weight_dist),
            "top_authorities_stats": self.top_authorities[:10],
            "type_stats": type_stats,
        })

        print(f"CatalogEngine loaded: {len(self.books)} books, {len(self.authorities)} authorities, {len(self.connections)} connections")

    def get_stats(self):
        """Return catalog statistics."""
        return self.stats

    def get_books_list(self, query=None, limit=100):
        """Return a list of books, optionally filtered and ranked by fuzzy search query."""
        results = []
        
        if query:
            norm_query = normalize_text(query)
            q_words = norm_query.split()
            for item in self.search_index:
                bid = item["biblio_id"]
                book = self.books.get(bid)
                if not book:
                    continue
                
                t_score = calculate_word_match_score(q_words, item["norm_title"])
                a_score = calculate_word_match_score(q_words, item["norm_author"]) if item["norm_author"] else 0
                
                best_auth_score = 0
                best_auth_name = ""
                best_auth_type = ""
                for auth in item["authorities"]:
                    auth_score = calculate_word_match_score(q_words, auth["norm_name"])
                    if auth_score > best_auth_score:
                        best_auth_score = auth_score
                        best_auth_name = auth["name"]
                        best_auth_type = auth["type"]
                
                # Apply weights to prioritize direct title/author queries over secondary metadata (authorities):
                # - Author matches are slightly boosted (1.1) to promote direct searches for author names.
                # - Title matches remain at standard scale (1.0).
                # - Authority matches (like Subjects or Places) are attenuated (0.7) to prevent weak/partial 
                #   concept matches from polluting direct author/title queries, while still allowing them to
                #   bubble up if the search is highly specific (e.g. searching "Feminismos").
                weighted_t = t_score * 1.0
                weighted_a = a_score * 1.1
                weighted_auth = best_auth_score * 0.7
                
                # Calculate final ranking score
                max_score = max(weighted_t, weighted_a, weighted_auth)
                
                # Filter out low-matching results to maintain relevance
                if max_score >= 55:
                    # Determine match explanation
                    if max_score == weighted_t:
                        explanation = f"Coincidencia en título: '{book['title']}'"
                    elif max_score == weighted_a:
                        explanation = f"Coincidencia en autor: '{book['author']}'"
                    else:
                        explanation = f"Coincidencia en {best_auth_type.lower()}: '{best_auth_name}'"
                    
                    conn_count = len(self.book_connections.get(bid, []))
                    
                    results.append({
                        "biblio_id": bid,
                        "title": book["title"],
                        "author": book["author"],
                        "authority_count": len(book["authorities"]),
                        "connection_count": conn_count,
                        "authorities": book["authorities"],
                        "match_score": round(min(max_score, 100.0), 1),
                        "match_explanation": explanation
                    })
            
            # Sort: highest match score first, connection count desc as tie-breaker
            results.sort(key=lambda x: (-x["match_score"], -x["connection_count"], x["title"]))
        
        else:
            # Standard listing: sort by connection count desc
            for bid, book in self.books.items():
                conn_count = len(self.book_connections.get(bid, []))
                results.append({
                    "biblio_id": bid,
                    "title": book["title"],
                    "author": book["author"],
                    "authority_count": len(book["authorities"]),
                    "connection_count": conn_count,
                    "authorities": book["authorities"],
                })
            results.sort(key=lambda x: (-x["connection_count"], x["title"]))
            
        return results[:limit]

    def get_book_detail(self, biblio_id):
        """Return detailed info for a single book including connected books."""
        book = self.books.get(biblio_id)
        if not book:
            return None

        connected = self.book_connections.get(biblio_id, [])
        connected_books = []
        for conn in connected[:20]:  # Limit to top 20 connections
            other = self.books.get(conn["biblio_id"])
            if other:
                connected_books.append({
                    "biblio_id": conn["biblio_id"],
                    "title": other["title"],
                    "author": other["author"],
                    "weight": conn["weight"],
                    "shared_authorities": conn["shared_authorities"],
                })

        return {
            "biblio_id": biblio_id,
            "title": book["title"],
            "author": book["author"],
            "authorities": book["authorities"],
            "connected_books": connected_books,
            "total_connections": len(connected),
        }

    def get_graph_data(self, biblio_id, max_connections=15):
        """
        Generate D3 force-directed graph data for a book's authority connections.
        Nodes: the target book, its authorities, and connected books.
        Links: book→authority, connected_book→shared_authority.
        """
        book = self.books.get(biblio_id)
        if not book:
            return {"nodes": [], "links": []}

        nodes = []
        links = []
        node_ids = set()

        # Central book node
        nodes.append({
            "id": f"book_{biblio_id}",
            "name": book["title"],
            "type": "target_book",
            "author": book["author"],
        })
        node_ids.add(f"book_{biblio_id}")

        # Authority nodes for this book
        for auth in book["authorities"]:
            aid = f"auth_{auth['authority_id']}"
            if aid not in node_ids:
                nodes.append({
                    "id": aid,
                    "name": auth["name"],
                    "type": "authority",
                    "authority_type": auth["type"],
                    "book_count": len(self.auth_to_books.get(auth["authority_id"], [])),
                })
                node_ids.add(aid)

            links.append({
                "source": f"book_{biblio_id}",
                "target": aid,
                "type": "has_authority",
                "authority_type": auth["type"],
            })

        # Connected book nodes (top N by weight)
        connected = self.book_connections.get(biblio_id, [])[:max_connections]
        for conn in connected:
            other_bid = conn["biblio_id"]
            other_book = self.books.get(other_bid)
            if not other_book:
                continue

            book_node_id = f"book_{other_bid}"
            if book_node_id not in node_ids:
                nodes.append({
                    "id": book_node_id,
                    "name": other_book["title"],
                    "type": "connected_book",
                    "author": other_book["author"],
                    "weight": conn["weight"],
                })
                node_ids.add(book_node_id)

            # Link connected book to shared authorities
            for shared_auth in conn["shared_authorities"]:
                auth_node_id = f"auth_{shared_auth['authority_id']}"

                # Add authority node if not yet present
                if auth_node_id not in node_ids:
                    nodes.append({
                        "id": auth_node_id,
                        "name": shared_auth["name"],
                        "type": "authority",
                        "authority_type": shared_auth["type"],
                        "book_count": len(self.auth_to_books.get(shared_auth["authority_id"], [])),
                    })
                    node_ids.add(auth_node_id)

                links.append({
                    "source": book_node_id,
                    "target": auth_node_id,
                    "type": "has_authority",
                    "authority_type": shared_auth["type"],
                })

        return {"nodes": nodes, "links": links}

    def get_authorities_list(self, auth_type=None, limit=100):
        """Return a list of authorities, optionally filtered by type."""
        results = []
        for auth in self.authorities:
            if auth_type and auth["type"] != auth_type:
                continue
            results.append(auth)

        results.sort(key=lambda x: (-x["book_count"], x["name"]))
        return results[:limit]

    def get_authority_detail(self, authority_id):
        """Return detail for a single authority including all linked books."""
        auth = self.auth_index.get(authority_id)
        if not auth:
            return None

        linked_books = []
        for bid in auth.get("biblio_ids", []):
            book = self.books.get(bid)
            if book:
                linked_books.append({
                    "biblio_id": bid,
                    "title": book["title"],
                    "author": book["author"],
                })

        linked_books.sort(key=lambda x: x["title"])

        return {
            "authority_id": authority_id,
            "name": auth["name"],
            "type": auth["type"],
            "book_count": auth["book_count"],
            "books": linked_books,
        }
