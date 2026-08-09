#!/usr/bin/env bash
set -e

echo "=== Installing Gems ==="
bundle install

echo "=== Preparing Database ==="
bundle exec rails db:prepare

echo "=== Seeding Data from JSON ==="
bundle exec rails import:all

# Fail loudly if the import didn't actually populate the catalog.
# On Render free tier the SQLite database is ephemeral, so this is
# the only signal that the data files made it into the build artifact
# AND the import task ran to completion. If you see the deploy fail
# at this line, the data/ directory was likely excluded from the
# build artifact — check Render's build logs for size or filter
# warnings.
BOOK_COUNT=$(bundle exec rails runner 'puts Book.count' 2>/dev/null | tail -1 | tr -dc '0-9')
if [ -z "$BOOK_COUNT" ] || [ "$BOOK_COUNT" -lt 100 ]; then
  echo "::error::Book count after import: $BOOK_COUNT (expected >= 100)."
  echo "::error::The data/ directory was probably not included in the build artifact."
  exit 1
fi
echo "Book count after import: $BOOK_COUNT (OK)"

echo "=== Precompiling Assets ==="
bundle exec rails assets:precompile

echo "=== Render Build Complete ==="
