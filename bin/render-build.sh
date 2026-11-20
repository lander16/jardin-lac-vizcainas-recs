#!/usr/bin/env bash
set -euo pipefail

echo "=== Configuring Bundler ==="
bundle config set --local without 'development test'

echo "=== Installing Gems ==="
bundle install

echo "=== Preparing Database ==="
SKIP_SEEDS=1 bundle exec rails db:prepare

echo "=== Importing Data ==="
bundle exec rails import:all

# Verify catalog, FTS5 index, and embeddings populated cleanly in the ephemeral SQLite DB.
bundle exec rails runner '
  checks = {
    "books" => [Book.count, 100],
    "book_words" => [BookWord.count, 1000],
    "book_words_fts" => [ActiveRecord::Base.connection.select_value("SELECT COUNT(*) FROM book_words_fts").to_i, 1000],
    "embeddings" => [Book.where.not(embedding: nil).count, 100]
  }

  failures = checks.filter_map do |name, (actual, minimum)|
    puts "#{name}: #{actual} (expected >= #{minimum})"
    "#{name}=#{actual}" if actual < minimum
  end

  abort("Render build verification failed: #{failures.join(", ")}") if failures.any?
'

echo "=== Precompiling Assets ==="
bundle exec rails assets:precompile

echo "=== Render Build Complete ==="
