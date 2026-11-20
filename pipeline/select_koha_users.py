"""
Sample 300 active patrons from Goodreads interactions mapped to Koha biblio_ids.

Fixes:
- Deduplicate checkouts by Koha biblio_id (prevents repeat rows across editions)
- Sort eligible users and per-user biblio_ids for deterministic output
- Bound checkout dates to 2024-01-01 .. 2026-06-30 (no future dates)
- Emit slim CSV without duplicated description blobs
"""

import csv
import json
import os
import random
import sys
import tempfile

try:
    from .config import CHECKOUTS_PATH, GOODREADS_DIR, MAPPING_PATH
except ImportError:
    from config import CHECKOUTS_PATH, GOODREADS_DIR, MAPPING_PATH

TARGET_USER_COUNT = 300
MIN_MATCHED_BOOKS = 10


def select_eligible_users(user_checkouts, target_count=TARGET_USER_COUNT, min_books=MIN_MATCHED_BOOKS, seed=42):
    eligible = sorted(uid for uid, books in user_checkouts.items() if len(books) >= min_books)
    if len(eligible) < target_count:
        fallback_min = 6
        eligible = sorted(uid for uid, books in user_checkouts.items() if len(books) >= fallback_min)
        print(f"  NOTE: fewer than {target_count} users at >= {min_books}; widened threshold to >= {fallback_min} ({len(eligible)} users).")
    if len(eligible) <= target_count:
        return eligible
    rng = random.Random(seed)
    return sorted(rng.sample(eligible, target_count))


def generate_checkout_date(rng):
    year = rng.choice([2024, 2025, 2026])
    max_month = 6 if year == 2026 else 12
    month = rng.randint(1, max_month)
    day = rng.randint(1, 28)
    hour = rng.randint(8, 20)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}"


def main():
    interactions_file = GOODREADS_DIR / "goodreads_interactions.csv"
    book_map_file = GOODREADS_DIR / "book_id_map.csv"
    user_map_file = GOODREADS_DIR / "user_id_map.csv"

    for required in (MAPPING_PATH, interactions_file, book_map_file, user_map_file):
        if not required.exists():
            print(f"Error: {required} not found.", file=sys.stderr)
            sys.exit(1)

    with open(MAPPING_PATH, "r", encoding="utf-8") as handle:
        mapping = json.load(handle)

    gr_book_to_koha = {}
    koha_titles = {}
    for _work_id, info in mapping["work_to_koha"].items():
        bid = str(info["biblio_id"])
        koha_titles[bid] = info["koha_title"]
        for gr_bid in info.get("gr_book_ids", []):
            gr_book_to_koha[gr_bid] = bid

    print(f"Loaded {len(gr_book_to_koha)} Goodreads edition IDs across {len(koha_titles)} Koha books.")

    book_id_map = {}
    with open(book_map_file, "r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            real_bid = row["book_id"]
            if real_bid in gr_book_to_koha:
                book_id_map[row["book_id_csv"]] = gr_book_to_koha[real_bid]

    user_id_map = {}
    with open(user_map_file, "r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            user_id_map[row["user_id_csv"]] = row["user_id"]

    user_checkouts = {}
    total_interactions = 0
    with open(interactions_file, "r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            total_interactions += 1
            if total_interactions % 20000000 == 0:
                print(f"  Scanned {total_interactions / 1000000:.0f}M interactions...")

            if row.get("is_read", "0") != "1" and row.get("rating", "0") == "0":
                continue

            koha_bid = book_id_map.get(row["book_id"])
            if not koha_bid:
                continue

            user_checkouts.setdefault(row["user_id"], set()).add(koha_bid)

    selected_uids = select_eligible_users(user_checkouts)
    print(f"Selected {len(selected_uids)} users from {len(user_checkouts)} active readers.")

    date_rng = random.Random(42)
    CHECKOUTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=f".{CHECKOUTS_PATH.name}.", dir=str(CHECKOUTS_PATH.parent))
    total_rows = 0
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["user_id", "book_id", "title", "checkout_date"])
            writer.writeheader()

            for user_csv_id in selected_uids:
                real_user_id = user_id_map.get(user_csv_id, f"user_{user_csv_id}")
                for koha_bid in sorted(user_checkouts[user_csv_id]):
                    writer.writerow({
                        "user_id": real_user_id,
                        "book_id": koha_bid,
                        "title": koha_titles.get(koha_bid, f"Book {koha_bid}"),
                        "checkout_date": generate_checkout_date(date_rng),
                    })
                    total_rows += 1
        os.chmod(tmp_path, 0o644)
        os.replace(tmp_path, CHECKOUTS_PATH)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise

    print(f"Wrote {total_rows} deduplicated checkouts to {CHECKOUTS_PATH}.")


if __name__ == "__main__":
    main()
