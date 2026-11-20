"""Shared configuration, paths, and text-normalization helpers for the pipeline."""

import json
import os
import re
import tempfile
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
KOHA_DIR = DATA_DIR / "koha"
GOODREADS_DIR = REPO_ROOT / "goodreads"
ONNX_DIR = DATA_DIR / "mini_lm_onnx"

CATALOG_PATH = KOHA_DIR / "catalog.json"
MAPPING_PATH = DATA_DIR / "koha_goodreads_mapping.json"
CHECKOUTS_PATH = DATA_DIR / "koha_checkouts.csv"
PATRON_NAMES_PATH = DATA_DIR / "patron_names.json"
BOOK_METADATA_PATH = DATA_DIR / "book_metadata.json"
USER_GRAPH_PATH = DATA_DIR / "user_graph.json"
AUTHORITY_GRAPH_PATH = KOHA_DIR / "authority_graph.json"
EMBEDDINGS_BIN_PATH = DATA_DIR / "embeddings.bin"
EMBEDDINGS_INDEX_PATH = DATA_DIR / "embeddings_index.json"
CONTENT_SIMILARITIES_PATH = DATA_DIR / "content_similarities.json"

ONLINE_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
ONLINE_MODEL_REVISION = (
    os.environ.get("SENTENCE_TRANSFORMER_REVISION")
    or "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
)
SIMILARITY_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
SIMILARITY_MODEL_REVISION = (
    os.environ.get("SIMILARITY_MODEL_REVISION")
    or "e8f8c211226b894fcb81acc59f3b34ba3efd5f42"
)
EMBEDDING_DIM = 384
ONNX_MAX_TOKENS = 128

INITIAL_AFTER_COMMA_RE = re.compile(r"(,\s+(?:[A-ZÁÉÍÓÚÜÑ]\.\s+)*[A-ZÁÉÍÓÚÜÑ])$")
TRAILING_SINGLE_INITIAL_RE = re.compile(r"(?:^|[\s.])[A-ZÁÉÍÓÚÜÑ]\.$")
COMMON_DOT_ABBREVS = ("S.A.", "S. A.", "Jr.", "Ed.", "Coord.", "Comp.", "Trad.", "Il.")


def clean_whitespace(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def fold_ascii(text):
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(text))
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def normalize_ascii_text(text):
    folded = fold_ascii(text).lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", folded)
    return re.sub(r"\s+", " ", cleaned).strip()


def restore_truncated_initials(name):
    cleaned = clean_whitespace(name)
    if not cleaned:
        return ""
    if INITIAL_AFTER_COMMA_RE.search(cleaned):
        return cleaned + "."
    return cleaned


def clean_marc_name(raw, *, preserve_initials=True):
    cleaned = clean_whitespace(raw)
    if not cleaned:
        return ""
    cleaned = re.sub(r"[\s,/;:\-]+$", "", cleaned)
    if cleaned.endswith("."):
        keep_dot = preserve_initials and (
            bool(TRAILING_SINGLE_INITIAL_RE.search(cleaned))
            or any(cleaned.endswith(abbr) for abbr in COMMON_DOT_ABBREVS)
        )
        if not keep_dot:
            cleaned = cleaned.rstrip(".").strip()
    if preserve_initials:
        cleaned = restore_truncated_initials(cleaned)
    return cleaned


def write_json_atomic(path, payload, *, indent=2):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=str(target.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=indent, ensure_ascii=False)
        os.chmod(tmp_name, 0o644)
        os.replace(tmp_name, target)
    except Exception:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise
