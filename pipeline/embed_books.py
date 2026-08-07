"""
Generate semantic embeddings for every book in the Koha catalog using
the sentence-transformers model all-MiniLM-L6-v2 (pinned to a specific
revision for reproducibility).

Inputs:  data/koha/catalog.json
Outputs: data/book_metadata.json
         data/embeddings.npz          (book_ids, embeddings)
         data/content_similarities.json  (top-50 cosine neighbours per book)
"""

import csv
import json
import os
import numpy as np
import sentence_transformers

# Pinned model name. Set SENTENCE_TRANSFORMER_REVISION in the environment
# to pin to a specific Hugging Face commit for byte-identical offline
# vectors across runs (recommended for production). When unset, the
# latest revision is used.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = os.environ.get("SENTENCE_TRANSFORMER_REVISION")  # None → latest

KATHA_CATALOG = "data/koha/catalog.json"
KOHA_CHECKOUTS_CSV = "data/koha_checkouts.csv"
OUTPUT_DIR = "data"
METADATA_FILE = os.path.join(OUTPUT_DIR, "book_metadata.json")
EMBEDDINGS_FILE = os.path.join(OUTPUT_DIR, "embeddings.npz")
# Ruby-friendly sidecars produced alongside the .npz so the Rails
# import task can stream the 384-dim vectors without needing a
# numpy / npy library in Ruby.
EMBEDDINGS_BIN_FILE = os.path.join(OUTPUT_DIR, "embeddings.bin")
EMBEDDINGS_INDEX_FILE = os.path.join(OUTPUT_DIR, "embeddings_index.json")
SIMILARITIES_FILE = os.path.join(OUTPUT_DIR, "content_similarities.json")
EMBEDDING_DIM = 384


def load_koha_books():
    """Read every book in the Koha catalog (titles + authors)."""
    if not os.path.exists(KATHA_CATALOG):
        raise FileNotFoundError(
            f"{KATHA_CATALOG} not found. Run pipeline/fetch_koha_catalog.py first."
        )
    with open(KATHA_CATALOG, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    print(f"Loaded {len(catalog)} books from Koha catalog.")
    return catalog


def load_koha_descriptions():
    """Optionally enrich titles with Goodreads descriptions when available."""
    descriptions = {}
    csv_path = KOHA_CHECKOUTS_CSV
    if not os.path.exists(csv_path):
        return descriptions
    with open(csv_path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            bid = row.get("book_id")
            desc = (row.get("description") or "").strip()
            if bid and desc and bid not in descriptions:
                descriptions[bid] = desc
    print(f"Loaded descriptions for {len(descriptions)} books (from checkout CSV).")
    return descriptions


def build_text(book, description):
    """Concatenate title + author + description for a single embedding."""
    parts = []
    if book.get("title"):
        parts.append(f"Title: {book['title']}")
    if book.get("author"):
        parts.append(f"Author: {book['author']}")
    if description:
        parts.append(f"Description: {description}")
    # Authority names add domain signal (subjects, places, periods).
    authorities = book.get("authorities") or []
    if authorities:
        auth_names = [a["name"] for a in authorities if a.get("name")]
        if auth_names:
            parts.append("Subjects: " + ", ".join(auth_names[:8]))
    return "\n".join(parts)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    koha_books = load_koha_books()
    descriptions = load_koha_descriptions()

    # Build per-book metadata + texts in a stable order.
    book_ids = []
    metadata = {}
    texts = []
    for book in koha_books:
        bid = book["biblio_id"]
        if not bid:
            continue
        desc = descriptions.get(bid, "")
        book_ids.append(bid)
        metadata[bid] = {
            "book_id": bid,
            "title": book.get("title", ""),
            "author": book.get("author", ""),
            "description": desc,
        }
        texts.append(build_text(book, desc))

    if MODEL_REVISION:
        rev_label = f"@{MODEL_REVISION[:7]}"
        model_kwargs = { "revision": MODEL_REVISION }
    else:
        rev_label = " (latest)"
        model_kwargs = {}
    print(f"Embedding {len(texts)} books with {MODEL_NAME}{rev_label}...")
    model = sentence_transformers.SentenceTransformer(MODEL_NAME, **model_kwargs)
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,  # unit-length so dot product == cosine
    )

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Saved metadata to {METADATA_FILE}")

    np.savez_compressed(
        EMBEDDINGS_FILE,
        book_ids=np.array(book_ids),
        embeddings=embeddings.astype(np.float32),
    )
    print(f"Saved embeddings to {EMBEDDINGS_FILE} (shape={embeddings.shape}, dtype=float32)")

    # Also write a flat little-endian float32 blob + JSON index so the
    # Rails import task can read row N at offset N*dim*4 without
    # needing numpy. Same vector data, just two redundant formats.
    with open(EMBEDDINGS_BIN_FILE, "wb") as f:
        f.write(embeddings.astype(np.float32).tobytes(order="C"))
    with open(EMBEDDINGS_INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {
                "model": MODEL_NAME,
                "revision": MODEL_REVISION,
                "dim": EMBEDDING_DIM,
                "count": len(book_ids),
                "book_ids": book_ids,
            },
            f,
            ensure_ascii=False,
        )
    print(
        f"Saved Ruby-friendly sidecars: "
        f"{EMBEDDINGS_BIN_FILE} ({os.path.getsize(EMBEDDINGS_BIN_FILE) / 1024 / 1024:.1f} MB), "
        f"{EMBEDDINGS_INDEX_FILE}"
    )

    # Precompute the top-50 cosine neighbours per book. Used by the
    # Rails RecommendationService + BookConnections.
    print("Precomputing top-50 cosine neighbours per book...")
    similarity_matrix = np.dot(embeddings, embeddings.T)  # already unit-normalised
    np.fill_diagonal(similarity_matrix, -np.inf)  # don't recommend self

    content_similarities = {}
    for i, bid in enumerate(book_ids):
        top_idx = np.argpartition(-similarity_matrix[i], 50)[:50]
        top_idx = top_idx[np.argsort(-similarity_matrix[i][top_idx])]
        content_similarities[bid] = [
            {"book_id": book_ids[j], "similarity": float(similarity_matrix[i][j])}
            for j in top_idx
        ]

    with open(SIMILARITIES_FILE, "w", encoding="utf-8") as f:
        json.dump(content_similarities, f, indent=2, ensure_ascii=False)
    print(f"Saved top-50 similarity pairs to {SIMILARITIES_FILE}")
    print("Embedding pipeline completed successfully!")


if __name__ == "__main__":
    main()
