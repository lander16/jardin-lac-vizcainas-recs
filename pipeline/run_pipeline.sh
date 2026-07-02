#!/bin/bash
set -e

# Change directory to the root of the project
cd "$(dirname "$0")/.."

echo "=== Vizcaínas Recommendation Pipeline ==="
echo "[1/4] Generating synthetic names mapping..."
python3 pipeline/generate_names.py

echo "[2/4] Generating book embeddings & content similarities (Heavy Lifting)..."
python3 pipeline/embed_books.py

echo "[3/4] Building user-user graph & Jaccard recommendations..."
python3 pipeline/build_graph.py

echo "[4/4] Merging results into hybrid recommendations..."
python3 pipeline/generate_recommendations.py

echo "=== Pipeline completed successfully! ==="
