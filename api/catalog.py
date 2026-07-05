"""
Catalog engine for serving Koha authority-based book data.
Loads precomputed data from data/koha/authority_graph.json.
"""

import json
import os
from collections import defaultdict


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

        self.books = data.get("books", {})
        self.authorities = data.get("authorities", [])
        self.connections = data.get("connections", [])
        self.top_authorities = data.get("top_authorities", [])
        self.stats = data.get("stats", {})

        # Build authority index
        for auth in self.authorities:
            self.auth_index[auth["authority_id"]] = auth
            self.auth_to_books[auth["authority_id"]] = auth.get("biblio_ids", [])

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

        # Update stats dict
        self.stats.update({
            "orphaned_books_count": len(orphaned_books),
            "sample_orphaned_books": orphaned_books[:10],
            "most_connected_books": most_connected[:10],
            "avg_connections_per_book": round(avg_conns, 2),
            "top_authorities_stats": self.top_authorities,
        })

        print(f"CatalogEngine loaded: {len(self.books)} books, {len(self.authorities)} authorities, {len(self.connections)} connections")

    def get_stats(self):
        """Return catalog statistics."""
        return self.stats

    def get_books_list(self, query=None, limit=100):
        """Return a list of books, optionally filtered by search query."""
        results = []
        for bid, book in self.books.items():
            if query:
                q = query.lower()
                if q not in book["title"].lower() and q not in book["author"].lower():
                    # Also search in authority names
                    auth_match = any(q in a["name"].lower() for a in book["authorities"])
                    if not auth_match:
                        continue

            # Count connections for this book
            conn_count = len(self.book_connections.get(bid, []))

            results.append({
                "biblio_id": bid,
                "title": book["title"],
                "author": book["author"],
                "authority_count": len(book["authorities"]),
                "connection_count": conn_count,
                "authorities": book["authorities"],
            })

        # Sort by connection count descending (most connected first)
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
