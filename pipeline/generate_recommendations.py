import csv
import json
import os

def main():
    output_dir = "data"
    csv_file = "synthetic_checkouts.csv"
    
    metadata_file = os.path.join(output_dir, "book_metadata.json")
    content_sim_file = os.path.join(output_dir, "content_similarities.json")
    collab_recs_file = os.path.join(output_dir, "collab_recommendations.json")
    names_file = os.path.join(output_dir, "patron_names.json")
    output_recs_file = os.path.join(output_dir, "recommendations.json")
    
    # Check if files exist
    for f in [metadata_file, content_sim_file, collab_recs_file, names_file]:
        if not os.path.exists(f):
            print(f"Error: Required file {f} does not exist yet. Please run previous pipeline steps first.")
            return

    print("Loading precomputed data...")
    with open(metadata_file, mode='r', encoding='utf-8') as f:
        books_metadata = json.load(f)
        
    with open(content_sim_file, mode='r', encoding='utf-8') as f:
        content_similarities = json.load(f)
        
    with open(collab_recs_file, mode='r', encoding='utf-8') as f:
        collab_recommendations = json.load(f)
        
    with open(names_file, mode='r', encoding='utf-8') as f:
        patron_names = json.load(f)

    # Load user checkouts
    print("Loading user checkouts from CSV...")
    user_checkouts = {}
    with open(csv_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_id = row['user_id']
            book_id = row['book_id']
            if user_id not in user_checkouts:
                user_checkouts[user_id] = []
            user_checkouts[user_id].append(book_id)

    print("Generating hybrid recommendations for each user...")
    hybrid_recommendations = {}
    alpha = 0.5 # Default alpha weight: 50% content, 50% collab
    
    for user_id, checkouts in user_checkouts.items():
        checkout_set = set(checkouts)
        patron_info = patron_names.get(user_id, {"name": f"User {user_id[:8]}"})
        
        # 1. Content-based candidates score:
        # Sum of similarities to all books checked out by this user
        content_scores = {}
        content_explanations = {}
        
        for checked_book_id in checkouts:
            if checked_book_id not in content_similarities:
                continue
            
            # Get similar books
            sim_books = content_similarities[checked_book_id]
            for item in sim_books:
                sim_book_id = item["book_id"]
                similarity = item["similarity"]
                
                # Exclude books user already checked out
                if sim_book_id in checkout_set:
                    continue
                    
                if sim_book_id not in content_scores:
                    content_scores[sim_book_id] = 0.0
                    content_explanations[sim_book_id] = []
                    
                content_scores[sim_book_id] += similarity
                content_explanations[sim_book_id].append({
                    "related_book_id": checked_book_id,
                    "related_title": books_metadata.get(checked_book_id, {}).get("title", f"Book {checked_book_id}"),
                    "similarity": similarity
                })
        
        # Sort explanations by similarity descending
        for b_id in content_explanations:
            content_explanations[b_id].sort(key=lambda x: x["similarity"], reverse=True)
            
        # 2. Collaborative candidates:
        collab_scores = {}
        collab_explanations = {}
        
        user_collab_recs = collab_recommendations.get(user_id, [])
        for item in user_collab_recs:
            collab_book_id = item["book_id"]
            # Collab score is already Jaccard sum
            collab_scores[collab_book_id] = item["score"]
            collab_explanations[collab_book_id] = item["contributing_users"]

        # 3. Combine and Normalize scores
        all_candidates = set(content_scores.keys()).union(set(collab_scores.keys()))
        
        # Find max scores for normalization
        max_content = max(content_scores.values()) if content_scores else 1.0
        max_collab = max(collab_scores.values()) if collab_scores else 1.0
        
        if max_content == 0: max_content = 1.0
        if max_collab == 0: max_collab = 1.0
        
        user_recs = []
        for b_id in all_candidates:
            raw_content = content_scores.get(b_id, 0.0)
            raw_collab = collab_scores.get(b_id, 0.0)
            
            norm_content = raw_content / max_content
            norm_collab = raw_collab / max_collab
            
            # Hybrid Score
            hybrid_score = alpha * norm_content + (1 - alpha) * norm_collab
            
            # Determine source
            has_content = b_id in content_scores
            has_collab = b_id in collab_scores
            
            if has_content and has_collab:
                source = "both"
            elif has_content:
                source = "content"
            else:
                source = "collaborative"
                
            # Build explanation JSON structure
            explanation = {
                "source": source,
                "content_details": content_explanations.get(b_id, [])[:3], # Top 3 similar books
                "collab_details": collab_explanations.get(b_id, [])[:5]     # Top 5 contributing users
            }
            
            book_info = books_metadata.get(b_id, {
                "title": f"Book {b_id}",
                "description": ""
            })
            
            user_recs.append({
                "book_id": b_id,
                "title": book_info["title"],
                "description": book_info["description"],
                "hybrid_score": float(hybrid_score),
                "norm_content_score": float(norm_content),
                "norm_collab_score": float(norm_collab),
                "raw_content_score": float(raw_content),
                "raw_collab_score": float(raw_collab),
                "source": source,
                "explanation": explanation
            })
            
        # Sort by hybrid score descending
        user_recs.sort(key=lambda x: x["hybrid_score"], reverse=True)
        
        hybrid_recommendations[user_id] = {
            "user_id": user_id,
            "name": patron_info["name"],
            "recommendations": user_recs[:30] # Top 30 final recommendations
        }
        
    with open(output_recs_file, mode='w', encoding='utf-8') as f:
        json.dump(hybrid_recommendations, f, indent=2, ensure_ascii=False)
        
    print(f"Hybrid recommendations successfully written to {output_recs_file}")
    print("Recommendation generation complete!")

if __name__ == "__main__":
    main()
