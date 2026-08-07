#!/usr/bin/env bash
set -e

echo "=== Installing Gems ==="
bundle install

echo "=== Preparing Database ==="
bundle exec rails db:prepare

echo "=== Seeding Data from JSON ==="
bundle exec rails import:all

# Warm the in-process ONNX model so the first catalog search after
# deploy doesn't pay the ~300 ms model-load cost. QueryEmbedder is
# silent if data/mini_lm_onnx/ is not present.
echo "=== Warming semantic search model ==="
bundle exec rails runner 'q = QueryEmbedder.default; q.encode("warmup") if q.available?' 2>/dev/null || true

echo "=== Precompiling Assets ==="
bundle exec rails assets:precompile

echo "=== Render Build Complete ==="
