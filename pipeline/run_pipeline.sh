#!/bin/bash
set -e

# Change directory to the root of the project
cd "$(dirname "$0")/.."

echo "=== Vizcaínas Recommendation Pipeline ==="

# 0. Fetch the live Koha catalog (produces data/koha/catalog.json,
#    required by steps 1, 5 and 6). Requires KOHA_CLIENT_ID and
#    KOHA_CLIENT_SECRET in the environment.
echo "[0/8] Fetching Koha catalog via REST API..."
python3 pipeline/fetch_koha_catalog.py

echo "[1/8] Matching Koha catalog with Goodreads books..."
python3 pipeline/match_koha_goodreads.py

echo "[2/8] Selecting 300 random users with Koha checkouts..."
python3 pipeline/select_koha_users.py

echo "[3/8] Generating synthetic names mapping..."
python3 pipeline/generate_names.py

echo "[4/8] Generating book embeddings & content similarities (Heavy Lifting)..."
python3 pipeline/embed_books.py

echo "[5/8] Building user-user graph & Jaccard recommendations..."
python3 pipeline/build_graph.py

echo "[6/8] Building book-book authority graph..."
python3 pipeline/build_authority_graph.py

echo "[7/8] Merging results into hybrid recommendations..."
python3 pipeline/generate_recommendations.py

echo "=== Pipeline completed successfully! ==="
