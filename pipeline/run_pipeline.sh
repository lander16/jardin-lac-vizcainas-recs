#!/bin/bash
set -e

# Change directory to the root of the project
cd "$(dirname "$0")/.."

echo "=== Vizcaínas Recommendation Pipeline ==="
echo "[1/6] Matching Koha catalog with Goodreads books..."
python3 pipeline/match_koha_goodreads.py

echo "[2/6] Selecting 300 random users with Koha checkouts..."
python3 pipeline/select_koha_users.py

echo "[3/6] Generating synthetic names mapping..."
python3 pipeline/generate_names.py

echo "[4/6] Generating book embeddings & content similarities (Heavy Lifting)..."
python3 pipeline/embed_books.py

echo "[5/6] Building user-user graph & Jaccard recommendations..."
python3 pipeline/build_graph.py

echo "[6/6] Merging results into hybrid recommendations..."
python3 pipeline/generate_recommendations.py

echo "=== Pipeline completed successfully! ==="
