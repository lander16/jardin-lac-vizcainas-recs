import os
import json
import csv

class RecommenderEngine:
    def __init__(self, data_dir="data", csv_path="data/koha_checkouts.csv"):
        self.data_dir = data_dir
        self.csv_path = csv_path
        
        self.metadata_path = os.path.join(data_dir, "book_metadata.json")
        self.content_sim_path = os.path.join(data_dir, "content_similarities.json")
        self.names_path = os.path.join(data_dir, "patron_names.json")
        self.user_graph_path = os.path.join(data_dir, "user_graph.json")
        self.active_checkouts_path = os.path.join(data_dir, "active_checkouts.json")
        self.authority_graph_path = os.path.join(data_dir, "koha/authority_graph.json")
        
        self.books = {}
        self.content_similarities = {}
        self.patrons = {}
        self.user_checkouts = {} # user_id -> set of book_ids
        self.checkout_history = [] # list of dicts for global logs
        self.authority_lookup = {}
        self.authority_connections = {}
        
        self.load_data()
        
    def load_data(self):
        # Load book metadata
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                self.books = json.load(f)
        else:
            print("Warning: book_metadata.json not found.")
            
        # Load content similarities
        if os.path.exists(self.content_sim_path):
            with open(self.content_sim_path, 'r', encoding='utf-8') as f:
                self.content_similarities = json.load(f)
        else:
            print("Warning: content_similarities.json not found.")
            
        # Load patron names
        if os.path.exists(self.names_path):
            with open(self.names_path, 'r', encoding='utf-8') as f:
                self.patrons = json.load(f)
        else:
            print("Warning: patron_names.json not found.")
            
        # Load active checkouts (stateful persistence for user interactions)
        if os.path.exists(self.active_checkouts_path):
            with open(self.active_checkouts_path, 'r', encoding='utf-8') as f:
                checkouts_list = json.load(f)
                self.user_checkouts = {uid: set(bids) for uid, bids in checkouts_list.items()}
        else:
            # Initialize from CSV
            self.user_checkouts = {}
            if os.path.exists(self.csv_path):
                with open(self.csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        uid = row['user_id']
                        bid = row['book_id']
                        if uid not in self.user_checkouts:
                            self.user_checkouts[uid] = set()
                        self.user_checkouts[uid].add(bid)
                self.save_active_checkouts()
            else:
                print("Warning: synthetic_checkouts.csv not found.")

        # Load authority graph
        if os.path.exists(self.authority_graph_path):
            with open(self.authority_graph_path, 'r', encoding='utf-8') as f:
                ag = json.load(f)
            
            self.authority_lookup = {
                auth['authority_id']: {
                    'name': auth.get('name', ''),
                    'type': auth.get('type', '')
                }
                for auth in ag.get('authorities', [])
            }

            self.authority_connections = {}
            for conn in ag.get('connections', []):
                src = conn['source']
                tgt = conn['target']
                weight = conn['weight']
                shared = conn.get('shared_authority_ids', [])

                if src not in self.authority_connections:
                    self.authority_connections[src] = {}
                self.authority_connections[src][tgt] = {
                    'weight': weight,
                    'shared_authority_ids': shared
                }

                if tgt not in self.authority_connections:
                    self.authority_connections[tgt] = {}
                self.authority_connections[tgt][src] = {
                    'weight': weight,
                    'shared_authority_ids': shared
                }
        else:
            print("Warning: koha/authority_graph.json not found.")
                
    def save_active_checkouts(self):
        os.makedirs(self.data_dir, exist_ok=True)
        # Convert set to list for JSON serialization
        serializable = {uid: list(bids) for uid, bids in self.user_checkouts.items()}
        with open(self.active_checkouts_path, 'w', encoding='utf-8') as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)
            
    def get_users_list(self):
        users = []
        for uid, bids in self.user_checkouts.items():
            patron_info = self.patrons.get(uid, {"name": f"User {uid[:8]}", "email": "", "cardnumber": ""})
            users.append({
                "user_id": uid,
                "name": patron_info["name"],
                "email": patron_info["email"],
                "cardnumber": patron_info["cardnumber"],
                "checkout_count": len(bids)
            })
        # Sort alphabetically by name
        users.sort(key=lambda x: x["name"].lower())
        return users

    def get_user_detail(self, user_id):
        if user_id not in self.user_checkouts:
            return None
            
        patron_info = self.patrons.get(user_id, {"name": f"User {user_id[:8]}", "email": "", "cardnumber": ""})
        checkout_ids = sorted(list(self.user_checkouts[user_id]))
        
        checkouts = []
        for bid in checkout_ids:
            book_info = self.books.get(bid, {"title": f"Book {bid}", "description": ""})
            checkouts.append({
                "book_id": bid,
                "title": book_info["title"],
                "description": book_info["description"]
            })
            
        return {
            "user_id": user_id,
            "name": patron_info["name"],
            "email": patron_info["email"],
            "cardnumber": patron_info["cardnumber"],
            "checkouts": checkouts
        }
        
    def add_checkout(self, user_id, book_id, title=None, description=None):
        if user_id not in self.user_checkouts:
            self.user_checkouts[user_id] = set()
            
        # Register new book if it is not in metadata
        if book_id not in self.books:
            self.books[book_id] = {
                "book_id": book_id,
                "title": title or f"Book {book_id}",
                "description": description or ""
            }
            # Save book metadata
            with open(self.metadata_path, 'w', encoding='utf-8') as f:
                json.dump(self.books, f, indent=2, ensure_ascii=False)
                
        self.user_checkouts[user_id].add(book_id)
        self.save_active_checkouts()
        return True
        
    def get_recommendations(self, user_id, w_content=None, w_collab=None, w_auth=None, alpha=None):
        if user_id not in self.user_checkouts:
            return []
            
        checkout_set = self.user_checkouts[user_id]
        if not checkout_set:
            return []
            
        # Parse weights and maintain backwards compatibility
        if w_content is None or w_collab is None or w_auth is None:
            if alpha is not None:
                w_content = float(alpha)
                w_collab = 1.0 - w_content
                w_auth = 0.0
            else:
                w_content = 0.33
                w_collab = 0.33
                w_auth = 0.34
        else:
            w_content = float(w_content)
            w_collab = float(w_collab)
            w_auth = float(w_auth)
            
            # Normalize weights to sum to 1.0
            total_w = w_content + w_collab + w_auth
            if total_w > 0:
                w_content /= total_w
                w_collab /= total_w
                w_auth /= total_w
            else:
                w_content, w_collab, w_auth = 0.33, 0.33, 0.34
            
        # 1. Content-based scores
        content_scores = {}
        content_explanations = {}
        
        for bid in checkout_set:
            if bid not in self.content_similarities:
                continue
            for item in self.content_similarities[bid]:
                sim_bid = item["book_id"]
                similarity = item["similarity"]
                
                if sim_bid in checkout_set:
                    continue
                    
                if sim_bid not in content_scores:
                    content_scores[sim_bid] = 0.0
                    content_explanations[sim_bid] = []
                    
                content_scores[sim_bid] += similarity
                content_explanations[sim_bid].append({
                    "related_book_id": bid,
                    "related_title": self.books.get(bid, {}).get("title", f"Book {bid}"),
                    "similarity": similarity
                })
                
        for bid in content_explanations:
            content_explanations[bid].sort(key=lambda x: x["similarity"], reverse=True)
            
        # 2. Collaborative filtering Jaccard calculations (Dynamically calculated)
        collab_scores = {}
        collab_contributions = {}
        
        for other_uid, other_bids in self.user_checkouts.items():
            if other_uid == user_id:
                continue
                
            intersection = checkout_set.intersection(other_bids)
            if not intersection:
                continue
                
            union = checkout_set.union(other_bids)
            jaccard = len(intersection) / len(union)
            
            if jaccard > 0:
                other_patron = self.patrons.get(other_uid, {"name": f"User {other_uid[:8]}"})
                candidates = other_bids.difference(checkout_set)
                for cand_bid in candidates:
                    if cand_bid not in collab_scores:
                        collab_scores[cand_bid] = 0.0
                        collab_contributions[cand_bid] = []
                    collab_scores[cand_bid] += jaccard
                    collab_contributions[cand_bid].append({
                        "user_id": other_uid,
                        "name": other_patron["name"],
                        "similarity": jaccard
                    })
                    
        for bid in collab_contributions:
            collab_contributions[bid].sort(key=lambda x: x["similarity"], reverse=True)
            
        # 3. Authority-based scores
        auth_scores = {}
        auth_explanations = {}
        
        for bid in checkout_set:
            if bid not in self.authority_connections:
                continue
            for sim_bid, conn_info in self.authority_connections[bid].items():
                if sim_bid in checkout_set:
                    continue
                    
                weight = conn_info['weight']
                shared_ids = conn_info['shared_authority_ids']
                
                if sim_bid not in auth_scores:
                    auth_scores[sim_bid] = 0.0
                    auth_explanations[sim_bid] = []
                    
                auth_scores[sim_bid] += weight
                
                resolved_authorities = [
                    {
                        'authority_id': aid,
                        'name': self.authority_lookup[aid]['name'],
                        'type': self.authority_lookup[aid]['type']
                    }
                    for aid in shared_ids
                    if aid in self.authority_lookup
                ]
                
                auth_explanations[sim_bid].append({
                    "related_book_id": bid,
                    "related_title": self.books.get(bid, {}).get("title", f"Book {bid}"),
                    "weight": weight,
                    "shared_authorities": resolved_authorities
                })
                
        for bid in auth_explanations:
            auth_explanations[bid].sort(key=lambda x: x["weight"], reverse=True)
            
        # 4. Hybrid Merge
        all_candidates = set(content_scores.keys()).union(set(collab_scores.keys())).union(set(auth_scores.keys()))
        
        max_content = max(content_scores.values()) if content_scores else 1.0
        max_collab = max(collab_scores.values()) if collab_scores else 1.0
        max_auth = max(auth_scores.values()) if auth_scores else 1.0
        
        if max_content == 0: max_content = 1.0
        if max_collab == 0: max_collab = 1.0
        if max_auth == 0: max_auth = 1.0
        
        recommendations = []
        for bid in all_candidates:
            raw_content = content_scores.get(bid, 0.0)
            raw_collab = collab_scores.get(bid, 0.0)
            raw_auth = auth_scores.get(bid, 0.0)
            
            norm_content = raw_content / max_content
            norm_collab = raw_collab / max_collab
            norm_auth = raw_auth / max_auth
            
            hybrid_score = (w_content * norm_content) + (w_collab * norm_collab) + (w_auth * norm_auth)
            
            sources = []
            if bid in content_scores: sources.append("content")
            if bid in collab_scores: sources.append("collaborative")
            if bid in auth_scores: sources.append("authority")
            
            if len(sources) == 3:
                source = "all"
            elif len(sources) == 2:
                source = "multiple"
            else:
                source = sources[0]
                
            explanation = {
                "source": source,
                "content_details": content_explanations.get(bid, [])[:3],
                "collab_details": collab_contributions.get(bid, [])[:5],
                "auth_details": auth_explanations.get(bid, [])[:3]
            }
            
            book_info = self.books.get(bid, {"title": f"Book {bid}", "description": ""})
            
            recommendations.append({
                "book_id": bid,
                "title": book_info["title"],
                "description": book_info["description"],
                "hybrid_score": float(hybrid_score),
                "norm_content_score": float(norm_content),
                "norm_collab_score": float(norm_collab),
                "norm_auth_score": float(norm_auth),
                "raw_content_score": float(raw_content),
                "raw_collab_score": float(raw_collab),
                "raw_auth_score": float(raw_auth),
                "source": source,
                "explanation": explanation
            })
            
        recommendations.sort(key=lambda x: x["hybrid_score"], reverse=True)
        return recommendations[:30]

    def get_graph_visualization_data(self, user_id, max_similar_users=10):
        if user_id not in self.user_checkouts:
            return {"nodes": [], "links": []}
            
        checkout_set = self.user_checkouts[user_id]
        
        # Calculate Jaccard similarities to all users
        similar_users = []
        for other_uid, other_bids in self.user_checkouts.items():
            if other_uid == user_id:
                continue
            intersection = checkout_set.intersection(other_bids)
            if not intersection:
                continue
            union = checkout_set.union(other_bids)
            jaccard = len(intersection) / len(union)
            if jaccard > 0:
                similar_users.append({
                    "user_id": other_uid,
                    "name": self.patrons.get(other_uid, {"name": f"User {other_uid[:8]}"})["name"],
                    "similarity": jaccard,
                    "shared_books": list(intersection)
                })
                
        # Sort and take top N
        similar_users.sort(key=lambda x: x["similarity"], reverse=True)
        top_similar_users = similar_users[:max_similar_users]
        
        nodes = []
        links = []
        
        # Target user node
        target_name = self.patrons.get(user_id, {"name": f"User {user_id[:8]}"})["name"]
        nodes.append({
            "id": user_id,
            "name": target_name,
            "type": "target_user",
            "group": 1
        })
        
        # Add similar users and links
        added_books = set()
        
        # First, add the books checked out by the target user
        for bid in checkout_set:
            book_title = self.books.get(bid, {}).get("title", f"Book {bid}")
            nodes.append({
                "id": f"book_{bid}",
                "name": book_title,
                "type": "target_book",
                "group": 2
            })
            links.append({
                "source": user_id,
                "target": f"book_{bid}",
                "value": 1.0,
                "type": "checkout"
            })
            added_books.add(bid)
            
        for sim_user in top_similar_users:
            uid = sim_user["user_id"]
            nodes.append({
                "id": uid,
                "name": sim_user["name"],
                "type": "similar_user",
                "group": 3,
                "similarity": sim_user["similarity"]
            })
            links.append({
                "source": user_id,
                "target": uid,
                "value": sim_user["similarity"],
                "type": "similarity"
            })
            
            # Add connections to books they checked out
            other_bids = self.user_checkouts[uid]
            for bid in other_bids:
                # If target user hasn't read it, add it as a potential collaborative recommendation node
                if bid not in checkout_set:
                    if bid not in added_books:
                        book_title = self.books.get(bid, {}).get("title", f"Book {bid}")
                        nodes.append({
                            "id": f"book_{bid}",
                            "name": book_title,
                            "type": "collab_book",
                            "group": 4
                        })
                        added_books.add(bid)
                    # Link similar user to book
                    links.append({
                        "source": uid,
                        "target": f"book_{bid}",
                        "value": 0.5,
                        "type": "checkout"
                    })
                else:
                    # Link similar user to shared book
                    links.append({
                        "source": uid,
                        "target": f"book_{bid}",
                        "value": 0.5,
                        "type": "shared_checkout"
                    })
                    
        return {"nodes": nodes, "links": links}
        
    def get_stats(self):
        total_users = len(self.user_checkouts)
        total_books = len(self.books)
        total_checkouts = sum(len(bids) for bids in self.user_checkouts.values())
        
        # Calculate book popularity
        book_counts = {}
        for bids in self.user_checkouts.values():
            for bid in bids:
                book_counts[bid] = book_counts.get(bid, 0) + 1
                
        popular_books = []
        for bid, count in sorted(book_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            popular_books.append({
                "book_id": bid,
                "title": self.books.get(bid, {}).get("title", f"Book {bid}"),
                "checkout_count": count
            })
            
        return {
            "total_users": total_users,
            "total_books": total_books,
            "total_checkouts": total_checkouts,
            "average_checkouts_per_user": total_checkouts / total_users if total_users > 0 else 0,
            "popular_books": popular_books
        }
        
    def get_book_details(self, book_id):
        if book_id not in self.books:
            return None
            
        book_info = self.books[book_id]
        
        # Get content similarities
        similar = []
        if book_id in self.content_similarities:
            for item in self.content_similarities[book_id][:10]:
                similar_bid = item["book_id"]
                similar.append({
                    "book_id": similar_bid,
                    "title": self.books.get(similar_bid, {}).get("title", f"Book {similar_bid}"),
                    "similarity": item["similarity"]
                })
                
        # Find patrons who checked this out
        checked_by = []
        for uid, bids in self.user_checkouts.items():
            if book_id in bids:
                patron_info = self.patrons.get(uid, {"name": f"User {uid[:8]}"})
                checked_by.append({
                    "user_id": uid,
                    "name": patron_info["name"]
                })
                
        return {
            "book_id": book_id,
            "title": book_info["title"],
            "description": book_info["description"],
            "similar_books": similar,
            "checked_by": checked_by
        }
        
    def search_books(self, query, limit=10):
        query = query.lower()
        results = []
        for bid, book in self.books.items():
            if query in book["title"].lower() or query in book["description"].lower():
                results.append({
                    "book_id": bid,
                    "title": book["title"],
                    "description": book["description"][:200] + "..." if len(book["description"]) > 200 else book["description"]
                })
                if len(results) >= limit:
                    break
        return results
