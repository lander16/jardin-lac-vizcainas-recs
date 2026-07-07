import csv
import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

def main():
    csv_file = "data/koha_checkouts.csv"
    output_dir = "data"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print("Loading data from CSV...")
    books = {}
    with open(csv_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            book_id = row['book_id']
            title = row.get('title') or ""
            description = row.get('description') or ""
            
            # Clean up title/description
            title = title.strip()
            description = description.strip()
            
            if book_id not in books:
                books[book_id] = {
                    "book_id": book_id,
                    "title": title,
                    "description": description
                }
            elif not books[book_id]["description"] and description:
                books[book_id]["description"] = description

    print(f"Found {len(books)} unique books.")
    
    # Save book metadata
    metadata_file = os.path.join(output_dir, "book_metadata.json")
    with open(metadata_file, mode='w', encoding='utf-8') as f:
        json.dump(books, f, indent=2, ensure_ascii=False)
    print(f"Saved book metadata to {metadata_file}")
    
    # Load model
    print("Loading sentence-transformer model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Prepare texts for embedding
    book_ids = list(books.keys())
    texts = []
    for b_id in book_ids:
        b = books[b_id]
        # Concatenate title and description
        if b["description"]:
            text = f"Title: {b['title']}\nDescription: {b['description']}"
        else:
            text = f"Title: {b['title']}"
        texts.append(text)
        
    print(f"Generating embeddings for {len(texts)} books...")
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    
    # Save embeddings
    embeddings_file = os.path.join(output_dir, "embeddings.npz")
    np.savez_compressed(embeddings_file, book_ids=np.array(book_ids), embeddings=embeddings)
    print(f"Saved embeddings to {embeddings_file}")
    
    # Precompute cosine similarities
    print("Precomputing cosine similarities...")
    # Normalize embeddings to unit length for simple dot product cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    # Avoid division by zero just in case
    norms[norms == 0] = 1.0
    norm_embeddings = embeddings / norms
    
    # Compute similarity matrix
    similarity_matrix = np.dot(norm_embeddings, norm_embeddings.T)
    
    # Save top 50 similar books for each book
    content_similarities = {}
    num_books = len(book_ids)
    
    for i in range(num_books):
        b_id = book_ids[i]
        # Get sorted similarity indices (descending)
        similar_indices = np.argsort(similarity_matrix[i])[::-1]
        
        # Collect top matches (excluding itself, which is index i)
        matches = []
        for idx in similar_indices:
            if idx == i:
                continue
            matches.append({
                "book_id": book_ids[idx],
                "similarity": float(similarity_matrix[i][idx])
            })
            if len(matches) >= 50:
                break
        content_similarities[b_id] = matches
        
    similarities_file = os.path.join(output_dir, "content_similarities.json")
    with open(similarities_file, mode='w', encoding='utf-8') as f:
        json.dump(content_similarities, f, indent=2, ensure_ascii=False)
    print(f"Saved similarities to {similarities_file}")
    print("Embedding pipeline completed successfully!")

if __name__ == "__main__":
    main()
