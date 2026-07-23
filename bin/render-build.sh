#!/usr/bin/env bash
set -e

echo "=== Installing Gems ==="
bundle install

echo "=== Preparing Database ==="
bundle exec rails db:prepare

echo "=== Seeding Data from JSON ==="
bundle exec rails import:all

echo "=== Precompiling Assets ==="
bundle exec rails assets:precompile

echo "=== Render Build Complete ==="
