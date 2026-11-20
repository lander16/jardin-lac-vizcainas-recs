#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SKIP_FETCH=false
if [ "${1:-}" = "--skip-fetch" ]; then
  SKIP_FETCH=true
fi

echo "=== Vizcainas Recommendation Pipeline ==="

if [ "$SKIP_FETCH" = false ]; then
  echo "[1/7] Fetching Koha catalog via REST API..."
  python3 pipeline/fetch_koha_catalog.py
else
  echo "[1/7] Skipping Koha fetch (--skip-fetch)."
fi

echo "[2/7] Cleaning Koha catalog..."
python3 pipeline/clean_catalog.py

echo "[3/7] Matching Koha catalog with Goodreads..."
python3 pipeline/match_koha_goodreads.py

echo "[4/7] Sampling 300 patrons & deduplicated checkouts..."
python3 pipeline/select_koha_users.py

echo "[5/7] Generating unique synthetic patron profiles..."
python3 pipeline/generate_names.py

echo "[6/7] Generating search embeddings & multilingual similarities..."
python3 pipeline/embed_books.py

echo "[7/7] Building user similarity graph and Adamic-Adar authority graph..."
python3 pipeline/build_graph.py
python3 pipeline/build_authority_graph.py

echo "=== Pipeline completed successfully! ==="
