"""
Generate two aligned semantic representations for the cleaned Koha catalog:
1. Offline multilingual similarities (`data/content_similarities.json`) using
   `paraphrase-multilingual-MiniLM-L12-v2` for accurate Spanish book/user
   recommendations without inflating Render memory or Git LFS size.
2. Runtime search vectors (`data/embeddings.bin` + `data/embeddings_index.json`)
   encoded directly through `data/mini_lm_onnx/model_quantized.onnx` +
   `tokenizer.json` so offline book vectors and Rails `QueryEmbedder` vectors
   live in the exact same quantized vector space (zero quantization drift).
Also writes clean `data/book_metadata.json` from `catalog.json` +
`data/koha_goodreads_mapping.json`.
"""

import argparse
import collections
import json
import os
import sys
import tempfile

try:
    from .config import (
        BOOK_METADATA_PATH,
        CATALOG_PATH,
        CONTENT_SIMILARITIES_PATH,
        EMBEDDING_DIM,
        EMBEDDINGS_BIN_PATH,
        EMBEDDINGS_INDEX_PATH,
        MAPPING_PATH,
        ONLINE_MODEL_NAME,
        ONLINE_MODEL_REVISION,
        ONNX_DIR,
        ONNX_MAX_TOKENS,
        SIMILARITY_MODEL_NAME,
        SIMILARITY_MODEL_REVISION,
        clean_whitespace,
        normalize_ascii_text,
        write_json_atomic,
    )
except ImportError:
    from config import (
        BOOK_METADATA_PATH,
        CATALOG_PATH,
        CONTENT_SIMILARITIES_PATH,
        EMBEDDING_DIM,
        EMBEDDINGS_BIN_PATH,
        EMBEDDINGS_INDEX_PATH,
        MAPPING_PATH,
        ONLINE_MODEL_NAME,
        ONLINE_MODEL_REVISION,
        ONNX_DIR,
        ONNX_MAX_TOKENS,
        SIMILARITY_MODEL_NAME,
        SIMILARITY_MODEL_REVISION,
        clean_whitespace,
        normalize_ascii_text,
        write_json_atomic,
    )

TOP_SIMILAR_COUNT = 50
MIN_SIMILARITY = 0.30
MAX_DESCRIPTION_CHARS = 240
MEGA_UMBRELLA_DF = 500


def load_koha_books(catalog_path=CATALOG_PATH):
    if not catalog_path.exists():
        raise FileNotFoundError(f"{catalog_path} not found. Run pipeline/fetch_koha_catalog.py first.")
    with open(catalog_path, "r", encoding="utf-8") as handle:
        raw = json.load(handle)

    deduped = {}
    for book in raw:
        bid = str(book.get("biblio_id") or "").strip()
        if not bid:
            continue
        if bid not in deduped:
            deduped[bid] = book
    return list(deduped.values())


def load_descriptions_from_mapping(mapping_path=MAPPING_PATH):
    """Load cleaned Spanish Goodreads descriptions for all matched catalog books."""
    descriptions = {}
    if not mapping_path.exists():
        return descriptions
    with open(mapping_path, "r", encoding="utf-8") as handle:
        mapping = json.load(handle)
    for _work_id, info in (mapping.get("work_to_koha") or {}).items():
        bid = str(info.get("biblio_id") or "").strip()
        desc = clean_whitespace(info.get("description") or "")
        if bid and desc and len(desc) > len(descriptions.get(bid, "")):
            descriptions[bid] = desc
    return descriptions


def compute_authority_frequencies(books):
    counts = collections.Counter()
    for book in books:
        seen = set()
        for auth in book.get("authorities") or []:
            aid = str(auth.get("authority_id") or "").strip()
            if aid and aid not in seen:
                seen.add(aid)
                counts[aid] += 1
    return counts


def build_text(book, description="", authority_df=None):
    """
    Build concise, high-signal text with Title, Author, and specific Subjects FIRST,
    and truncated Description LAST so sequence truncation never drops authorities.
    """
    parts = []
    title = clean_whitespace(book.get("title") or "")
    author = clean_whitespace(book.get("author") or "")
    if title:
        parts.append(title)
    if author:
        parts.append(author)

    norm_author = normalize_ascii_text(author)
    auth_df = authority_df or {}
    seen_names = set()
    subject_candidates = []
    for auth in book.get("authorities") or []:
        name = clean_whitespace(auth.get("name") or "")
        if not name:
            continue
        norm_name = normalize_ascii_text(name)
        if norm_author and norm_name == norm_author:
            continue
        if norm_name in seen_names:
            continue
        seen_names.add(norm_name)
        df = auth_df.get(str(auth.get("authority_id") or ""), 1)
        is_mega = 1 if df > MEGA_UMBRELLA_DF else 0
        subject_candidates.append((is_mega, df, name))

    subject_candidates.sort(key=lambda item: (item[0], item[1], item[2]))
    chosen_subjects = [name for _, _, name in subject_candidates[:12]]
    if chosen_subjects:
        parts.append("; ".join(chosen_subjects))

    clean_desc = clean_whitespace(description)
    if clean_desc:
        parts.append(clean_desc[:MAX_DESCRIPTION_CHARS])

    return ". ".join(parts)


def compute_top_similarities(book_ids, embeddings, *, top_k=TOP_SIMILAR_COUNT, min_similarity=MIN_SIMILARITY):
    import numpy as np

    n = len(book_ids)
    if n <= 1:
        return {bid: [] for bid in book_ids}

    k = min(top_k, n - 1)
    sim_matrix = np.dot(embeddings, embeddings.T)
    np.clip(sim_matrix, -1.0, 1.0, out=sim_matrix)
    np.fill_diagonal(sim_matrix, -np.inf)

    content_similarities = {}
    for i, bid in enumerate(book_ids):
        row = sim_matrix[i]
        top_idx = np.argpartition(-row, k - 1)[:k]
        top_idx = top_idx[np.argsort(-row[top_idx])]
        neighbors = []
        for j in top_idx:
            score = float(row[j])
            if not np.isfinite(score) or score < min_similarity:
                continue
            neighbors.append({"book_id": book_ids[j], "similarity": round(min(score, 1.0), 6)})
        content_similarities[bid] = neighbors
    return content_similarities


def encode_with_onnx(texts, onnx_dir=ONNX_DIR, *, max_tokens=ONNX_MAX_TOKENS, batch_size=64):
    import numpy as np
    import onnxruntime as ort
    from tokenizers import Tokenizer

    model_path = onnx_dir / "model_quantized.onnx"
    if not model_path.exists():
        model_path = onnx_dir / "model.onnx"
    tokenizer_path = onnx_dir / "tokenizer.json"

    tokenizer = Tokenizer.from_file(str(tokenizer_path))
    tokenizer.enable_truncation(max_length=max_tokens)
    tokenizer.enable_padding(pad_id=0, length=max_tokens)

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_names = {inp.name for inp in session.get_inputs()}
    output_names = [out.name for out in session.get_outputs()]

    vectors = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start:start + batch_size]
        encodings = tokenizer.encode_batch(batch)
        input_ids = np.array([enc.ids for enc in encodings], dtype=np.int64)
        attention_mask = np.array([enc.attention_mask for enc in encodings], dtype=np.int64)

        feeds = {"input_ids": input_ids, "attention_mask": attention_mask}
        if "token_type_ids" in input_names:
            feeds["token_type_ids"] = np.zeros_like(input_ids, dtype=np.int64)

        token_embeddings = session.run(output_names, feeds)[0]
        mask_expanded = np.expand_dims(attention_mask, axis=-1).astype(np.float32)
        summed = np.sum(token_embeddings * mask_expanded, axis=1)
        counts = np.clip(np.sum(mask_expanded, axis=1), a_min=1e-9, a_max=None)
        pooled = summed / counts
        norms = np.linalg.norm(pooled, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        vectors.append((pooled / norms).astype(np.float32))

    return np.vstack(vectors)


def write_bytes_atomic(path, payload_bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload_bytes)
        os.chmod(tmp_name, 0o644)
        os.replace(tmp_name, path)
    except Exception:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise


def main():
    parser = argparse.ArgumentParser(description="Generate catalog metadata, ONNX search embeddings, and multilingual content similarities.")
    parser.add_argument("--skip-similarities", action="store_true", help="Only rebuild metadata and ONNX search embeddings.")
    args = parser.parse_args()

    koha_books = load_koha_books()
    descriptions = load_descriptions_from_mapping()
    auth_df = compute_authority_frequencies(koha_books)
    print(f"Loaded {len(koha_books)} unique books and {len(descriptions)} Spanish descriptions.")

    book_ids = []
    metadata = {}
    texts = []
    for book in koha_books:
        bid = str(book["biblio_id"])
        desc = descriptions.get(bid, "")
        book_ids.append(bid)
        metadata[bid] = {
            "book_id": bid,
            "title": book.get("title", ""),
            "author": book.get("author", ""),
            "description": desc,
        }
        texts.append(build_text(book, desc, authority_df=auth_df))

    write_json_atomic(BOOK_METADATA_PATH, metadata)
    print(f"Saved metadata ({len(metadata)} books) -> {BOOK_METADATA_PATH}")

    print(f"Encoding {len(texts)} runtime search embeddings with {ONNX_DIR}...")
    import numpy as np

    online_embeddings = encode_with_onnx(texts)
    assert online_embeddings.shape == (len(book_ids), EMBEDDING_DIM)
    assert not np.isnan(online_embeddings).any(), "NaN in ONNX embeddings"

    write_bytes_atomic(EMBEDDINGS_BIN_PATH, online_embeddings.astype(np.float32).tobytes(order="C"))
    write_json_atomic(
        EMBEDDINGS_INDEX_PATH,
        {
            "model": ONLINE_MODEL_NAME,
            "revision": ONLINE_MODEL_REVISION,
            "dim": EMBEDDING_DIM,
            "count": len(book_ids),
            "book_ids": book_ids,
        },
        indent=None,
    )
    print(f"Saved ONNX-aligned embeddings -> {EMBEDDINGS_BIN_PATH}")

    if not args.skip_similarities:
        import sentence_transformers

        print(f"Encoding {len(texts)} multilingual vectors with {SIMILARITY_MODEL_NAME}@{SIMILARITY_MODEL_REVISION[:7]}...")
        sim_model = sentence_transformers.SentenceTransformer(
            SIMILARITY_MODEL_NAME,
            revision=SIMILARITY_MODEL_REVISION,
        )
        sim_embeddings = sim_model.encode(
            texts,
            batch_size=64,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True,
        ).astype(np.float32)

        content_similarities = compute_top_similarities(book_ids, sim_embeddings)
        write_json_atomic(CONTENT_SIMILARITIES_PATH, content_similarities)
        print(f"Saved multilingual similarities ({len(content_similarities)} books) -> {CONTENT_SIMILARITIES_PATH}")


if __name__ == "__main__":
    main()
