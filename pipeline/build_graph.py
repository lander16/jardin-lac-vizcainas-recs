import csv
import json
import os
import networkx as nx

def main():
    csv_file = "data/koha_checkouts.csv"
    output_dir = "data"
    names_file = os.path.join(output_dir, "patron_names.json")
    
    # Load synthetic names mapping
    patron_names = {}
    if os.path.exists(names_file):
        with open(names_file, mode='r', encoding='utf-8') as f:
            patron_names = json.load(f)
            
    print("Loading data from CSV and building user-book sets...")
    user_checkouts = {}
    book_users = {}
    book_titles = {}
    
    with open(csv_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_id = row['user_id']
            book_id = row['book_id']
            title = row.get('title') or f"Book {book_id}"
            
            book_titles[book_id] = title
            
            if user_id not in user_checkouts:
                user_checkouts[user_id] = set()
            user_checkouts[user_id].add(book_id)
            
            if book_id not in book_users:
                book_users[book_id] = set()
            book_users[book_id].add(user_id)
            
    print(f"Loaded {len(user_checkouts)} users and {len(book_users)} books.")
    
    # Build User Jaccard Similarities
    print("Computing user-user similarities based on checkouts...")
    user_ids = sorted(list(user_checkouts.keys()))
    user_graph_data = {}
    
    for u1 in user_ids:
        u1_books = user_checkouts[u1]
        similar_users = []
        
        for u2 in user_ids:
            if u1 == u2:
                continue
            u2_books = user_checkouts[u2]
            intersection = u1_books.intersection(u2_books)
            if not intersection:
                continue
                
            union = u1_books.union(u2_books)
            jaccard = len(intersection) / len(union)
            
            # Save if there is some overlap
            if jaccard > 0.0:
                u2_info = patron_names.get(u2, {"name": f"User {u2[:8]}"})
                similar_users.append({
                    "user_id": u2,
                    "name": u2_info["name"],
                    "similarity": jaccard,
                    "shared_books": sorted(list(intersection))
                })
                
        # Sort similar users by similarity descending
        similar_users.sort(key=lambda x: x["similarity"], reverse=True)
        
        u1_info = patron_names.get(u1, {"name": f"User {u1[:8]}"})
        user_graph_data[u1] = {
            "user_id": u1,
            "name": u1_info["name"],
            "checkouts": sorted(list(u1_books)),
            "similar_users": similar_users[:30] # Top 30 similar users for viz size control
        }
        
    user_graph_file = os.path.join(output_dir, "user_graph.json")
    with open(user_graph_file, mode='w', encoding='utf-8') as f:
        json.dump(user_graph_data, f, indent=2, ensure_ascii=False)
    print(f"Saved user graph structure to {user_graph_file}")
    
    # Compute collaborative recommendations for each user
    print("Generating collaborative recommendations...")
    collab_recommendations = {}
    
    for u_target in user_ids:
        target_books = user_checkouts[u_target]
        recs = {}
        
        # Look at similar users
        similar_users = user_graph_data[u_target]["similar_users"]
        
        for sim_user in similar_users:
            u_other = sim_user["user_id"]
            other_name = sim_user["name"]
            similarity = sim_user["similarity"]
            
            # Books they read that target hasn't
            other_books = user_checkouts[u_other]
            candidate_books = other_books.difference(target_books)
            
            for b_id in candidate_books:
                if b_id not in recs:
                    recs[b_id] = {
                        "book_id": b_id,
                        "title": book_titles.get(b_id, f"Book {b_id}"),
                        "score": 0.0,
                        "contributing_users": []
                    }
                recs[b_id]["score"] += similarity
                recs[b_id]["contributing_users"].append({
                    "user_id": u_other,
                    "name": other_name,
                    "similarity": similarity
                })
                
        # Format and sort recommendations
        sorted_recs = []
        for b_id, rec in recs.items():
            # Sort contributing users by similarity descending
            rec["contributing_users"].sort(key=lambda x: x["similarity"], reverse=True)
            # Cap contributing users details for JSON size
            sorted_recs.append({
                "book_id": b_id,
                "title": rec["title"],
                "score": rec["score"],
                "contributing_users": rec["contributing_users"][:10]
            })
            
        sorted_recs.sort(key=lambda x: x["score"], reverse=True)
        collab_recommendations[u_target] = sorted_recs[:50] # Top 50 collab recs
        
    collab_recs_file = os.path.join(output_dir, "collab_recommendations.json")
    with open(collab_recs_file, mode='w', encoding='utf-8') as f:
        json.dump(collab_recommendations, f, indent=2, ensure_ascii=False)
    print(f"Saved collaborative recommendations to {collab_recs_file}")
    print("Graph and Collaborative filtering pipeline completed successfully!")

if __name__ == "__main__":
    main()
