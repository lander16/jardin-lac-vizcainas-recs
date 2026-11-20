"""
Clean and normalize an existing data/koha/catalog.json in place (idempotent).

Repairs:
- Known Koha/MARC001 biblio_id collision ("8000" shared by Cabrales [6993] and Zuboff [8000])
- Confirmed Koha cataloging test records ("Prueba", "JUEGOS DE MESA_Prueba")
- Multiple internal spaces in titles, authors, and authority names
- Truncated single-letter trailing initials (e.g. "Rowling, J. K" -> "Rowling, J. K.")
- Blank authority names and duplicate authority links on the same book
- Missing book author backfilled from linked 100/700/110/710 authorities
- Same-family duplicate/accent-variant authority IDs canonicalized
"""

import collections
import json
import sys

try:
    from .config import (
        CATALOG_PATH,
        clean_whitespace,
        normalize_ascii_text,
        restore_truncated_initials,
        write_json_atomic,
    )
except ImportError:
    from config import (
        CATALOG_PATH,
        clean_whitespace,
        normalize_ascii_text,
        restore_truncated_initials,
        write_json_atomic,
    )

TEST_RECORD_IDS = {"6712", "7982"}
AUTHOR_FIELDS = ("100", "700", "110", "710")
PRIMARY_ROLE_FIELDS = {"100", "110", "130", "700", "710"}
AUTHORITY_FAMILIES = {
    "Autor": "Person",
    "Tema (Persona)": "Person",
    "Corporativo": "Corp",
    "Institución / Organización": "Corp",
    "Tema (Corporativo)": "Corp",
    "Tema (Institución)": "Corp",
    "Tema": "Tema",
    "Lugar": "Lugar",
    "Título Uniforme": "Title",
}


def _non_ascii_count(text):
    return sum(1 for ch in text if ord(ch) > 127)


def clean_catalog_records(catalog):
    """Return cleaned catalog list and summary stats dict."""
    records = [dict(book) for book in catalog]
    stats = collections.Counter()

    used_ids = {str(b.get("biblio_id", "")).strip() for b in records}
    id_counts = collections.Counter(str(b.get("biblio_id", "")).strip() for b in records)
    if id_counts.get("8000", 0) > 1 and "6993" not in used_ids:
        for book in records:
            if str(book.get("biblio_id")) == "8000":
                auth_blob = " ".join(
                    [book.get("author", ""), book.get("title", "")]
                    + [a.get("name", "") for a in (book.get("authorities") or [])]
                )
                if "cabrales" in normalize_ascii_text(auth_blob):
                    book["biblio_id"] = "6993"
                    stats["reassigned_8000_to_6993"] += 1
                    break

    cleaned_records = []
    seen_ids = set()
    for book in records:
        bid = str(book.get("biblio_id", "")).strip()
        if not bid or bid in TEST_RECORD_IDS:
            stats["removed_test_records"] += 1
            continue
        if bid in seen_ids:
            raise ValueError(f"Duplicate biblio_id remains in catalog: {bid}")
        seen_ids.add(bid)

        title = clean_whitespace(book.get("title", ""))
        author = restore_truncated_initials(clean_whitespace(book.get("author", "")))

        cleaned_auths = []
        for auth in book.get("authorities") or []:
            raw_name = clean_whitespace(auth.get("name", ""))
            if not raw_name:
                stats["removed_blank_authorities"] += 1
                continue
            auth_type = clean_whitespace(auth.get("type", ""))
            if auth_type in ("Autor", "Tema (Persona)"):
                raw_name = restore_truncated_initials(raw_name)
            cleaned_auths.append({
                "authority_id": str(auth.get("authority_id", "")).strip(),
                "name": raw_name,
                "type": auth_type,
                "marc_field": str(auth.get("marc_field", "")).strip(),
            })

        book_copy = dict(book)
        book_copy["biblio_id"] = bid
        book_copy["title"] = title
        book_copy["author"] = author
        book_copy["authorities"] = cleaned_auths
        cleaned_records.append(book_copy)

    # Canonicalize duplicate authorities sharing (normalized_name, family)
    cluster_aid_counts = collections.defaultdict(lambda: collections.Counter())
    aid_name_counts = collections.defaultdict(collections.Counter)
    for book in cleaned_records:
        for auth in book["authorities"]:
            family = AUTHORITY_FAMILIES.get(auth["type"], auth["type"])
            key = (normalize_ascii_text(auth["name"]), family)
            cluster_aid_counts[key][auth["authority_id"]] += 1
            aid_name_counts[key][auth["name"]] += 1

    remap = {}
    canonical_names = {}
    for key, aid_counter in cluster_aid_counts.items():
        if len(aid_counter) > 1:
            canonical_aid = max(
                aid_counter.keys(),
                key=lambda aid: (aid_counter[aid], -(int(aid) if aid.isdigit() else 999999999)),
            )
            best_name = max(
                aid_name_counts[key].keys(),
                key=lambda n: (_non_ascii_count(n), aid_name_counts[key][n]),
            )
            family = key[1]
            for aid in aid_counter:
                if aid != canonical_aid:
                    remap[(aid, family)] = canonical_aid
                    stats["canonicalized_authority_links"] += 1
            canonical_names[(canonical_aid, family)] = best_name

    # Apply canonical IDs, deduplicate authorities per book, and backfill missing authors
    for book in cleaned_records:
        by_aid = {}
        for auth in book["authorities"]:
            family = AUTHORITY_FAMILIES.get(auth["type"], auth["type"])
            aid = remap.get((auth["authority_id"], family), auth["authority_id"])
            name = canonical_names.get((aid, family), auth["name"])
            updated = dict(auth, authority_id=aid, name=name)

            if aid not in by_aid:
                by_aid[aid] = updated
            else:
                stats["deduped_book_authorities"] += 1
                existing = by_aid[aid]
                # Prefer primary creator MARC roles over subject roles if both exist on the same book
                if updated["marc_field"] in PRIMARY_ROLE_FIELDS and existing["marc_field"] not in PRIMARY_ROLE_FIELDS:
                    by_aid[aid] = updated

        book["authorities"] = list(by_aid.values())

        if not book["author"]:
            for tag in AUTHOR_FIELDS:
                creator = next((a["name"] for a in book["authorities"] if a["marc_field"] == tag), None)
                if creator:
                    book["author"] = creator
                    stats["backfilled_authors"] += 1
                    break

    return cleaned_records, dict(stats)


def main():
    if not CATALOG_PATH.exists():
        print(f"Error: {CATALOG_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    with open(CATALOG_PATH, "r", encoding="utf-8") as handle:
        raw_catalog = json.load(handle)

    cleaned, stats = clean_catalog_records(raw_catalog)
    write_json_atomic(CATALOG_PATH, cleaned)
    print(f"Cleaned catalog: {len(raw_catalog)} -> {len(cleaned)} records. Stats: {stats}")


if __name__ == "__main__":
    main()
