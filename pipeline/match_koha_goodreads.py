"""
Match Koha catalog records against Goodreads books safely:
- Accent-folded title normalization
- 1-to-1 cap (at most one Goodreads work_id per Koha biblio_id)
- Author surname verification & rejection of ambiguous homonym titles
- Spanish description preference + HTML/SGML/control-char/boilerplate cleanup
"""

import collections
import html
import json
import re
import sys

try:
    from .config import (
        CATALOG_PATH,
        GOODREADS_DIR,
        MAPPING_PATH,
        clean_whitespace,
        normalize_ascii_text,
        write_json_atomic,
    )
except ImportError:
    from config import (
        CATALOG_PATH,
        GOODREADS_DIR,
        MAPPING_PATH,
        clean_whitespace,
        normalize_ascii_text,
        write_json_atomic,
    )

SPANISH_LANG_CODES = {"spa", "es", "es-mx", "es-es", "es-419"}
NON_SPANISH_LANG_PREFIXES = ("eng", "en-", "ita", "ger", "deu", "fre", "fra", "por", "fin", "tur", "ara", "ind", "rus", "jpn", "zho", "pol", "dut", "nl", "swe", "slo", "slk")
SPANISH_MARKER_WORDS = {"el", "la", "los", "las", "de", "del", "que", "una", "con", "para", "por", "como", "sus", "entre", "sobre", "vida", "historia", "novela", "obra", "este", "esta"}
NON_SPANISH_MARKER_WORDS = {"the", "and", "with", "that", "from", "this", "his", "her", "which", "about", "della", "degli", "che", "eine", "und", "der", "die", "das", "pour", "avec", "dans", "uma", "nao", "para", "och", "hän", "bir", "ve"}
BOILERPLATE_PREFIXES = (
    "this is an exact reproduction of a book published before 1923",
    "esta sinopse contem spoilers",
    "librarian note:",
    "editorial reviews",
    "from the inside flap",
    "product description",
    "amazon.com review",
    "the barnes & noble review",
)
TITLE_STOPWORDS = {"el", "la", "los", "las", "un", "una", "de", "del", "al", "y", "e", "en", "a", "the", "of", "and"}


def normalize_title(title):
    return normalize_ascii_text(title)


def extract_author_surnames(koha_author):
    if not koha_author:
        return []
    head = str(koha_author).split(",")[0]
    tokens = normalize_ascii_text(head).split()
    return [t for t in tokens if len(t) >= 4]


def significant_title_words(norm_title):
    return [w for w in norm_title.split() if len(w) >= 3 and w not in TITLE_STOPWORDS]


def clean_description(raw):
    if not raw:
        return ""
    text = str(raw)
    # Repair Goodreads ASCII guillemets before stripping HTML tags
    text = text.replace("<<", "«").replace(">>", "»").replace("<>", "")
    # Remove Barnes & Noble SGML wrappers such as &&LDIV&&R, &&LI&&R, &&L/I&&R
    text = re.sub(r"&&L/?[A-Za-z0-9]+&&R", " ", text)
    text = html.unescape(text)
    text = text.replace("<<", "«").replace(">>", "»").replace("<>", "")
    text = re.sub(r"<[^>]+>", " ", text)
    # Strip ASCII control chars except newline/tab
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)
    # Drop librarian/spoiler/editorial noise lines
    lines = [clean_whitespace(line) for line in text.splitlines()]
    kept = []
    for line in lines:
        if not line:
            continue
        low = line.lower()
        if any(low.startswith(prefix) for prefix in BOILERPLATE_PREFIXES):
            continue
        kept.append(line)
    cleaned = clean_whitespace(" ".join(kept))
    if any(cleaned.lower().startswith(prefix) for prefix in BOILERPLATE_PREFIXES):
        return ""
    return cleaned


def is_spanish_description(text, language_code=""):
    lang = (language_code or "").strip().lower()
    if lang in SPANISH_LANG_CODES or lang.startswith("spa"):
        return True
    if lang and any(lang.startswith(prefix) for prefix in NON_SPANISH_LANG_PREFIXES):
        return False

    words = set(normalize_ascii_text(text).split())
    if len(words) < 6:
        return False
    es_hits = len(words & SPANISH_MARKER_WORDS)
    non_es_hits = len(words & NON_SPANISH_MARKER_WORDS)
    # Buckwalter Arabic transliteration heuristic: many short uppercase/lowercase consonants without Spanish function words
    return es_hits >= 2 and es_hits > non_es_hits * 2


def select_best_work_and_description(koha_book, candidate_editions_by_work):
    """
    Choose at most ONE verified Goodreads work_id for a Koha book, plus its best cleaned Spanish description.
    candidate_editions_by_work: dict[work_id -> list[edition_dict]]
    """
    if not candidate_editions_by_work:
        return None, ""

    surnames = extract_author_surnames(koha_book.get("author", ""))
    norm_title = normalize_title(koha_book.get("title", ""))
    sig_words = significant_title_words(norm_title)

    work_scores = []
    for work_id, editions in candidate_editions_by_work.items():
        author_verified = False
        max_ratings = 0
        spanish_descs = []

        for ed in editions:
            ratings = int(ed.get("ratings_count") or 0)
            if ratings > max_ratings:
                max_ratings = ratings

            haystack = normalize_ascii_text(
                " ".join([ed.get("description", ""), ed.get("title", ""), ed.get("url", "")])
            )
            if surnames and all(s in haystack for s in surnames):
                author_verified = True

            cleaned_desc = clean_description(ed.get("description", ""))
            if len(cleaned_desc) >= 40 and is_spanish_description(cleaned_desc, ed.get("language_code", "")):
                is_explicit_spa = (ed.get("language_code", "").lower().startswith("spa") or ed.get("language_code", "").lower() == "es")
                spanish_descs.append((1 if is_explicit_spa else 0, ratings, len(cleaned_desc), cleaned_desc))

        work_scores.append({
            "work_id": work_id,
            "author_verified": author_verified,
            "max_ratings": max_ratings,
            "spanish_descs": spanish_descs,
        })

    verified = [w for w in work_scores if w["author_verified"]]
    if len(verified) == 1:
        chosen = verified[0]
    elif len(verified) > 1:
        chosen = max(verified, key=lambda w: (len(w["spanish_descs"]) > 0, w["max_ratings"]))
    elif len(work_scores) == 1 and len(sig_words) >= 2:
        chosen = work_scores[0]
    else:
        # Reject ambiguous multi-work homonyms or 1-word titles without author confirmation
        return None, ""

    best_desc = ""
    if chosen["spanish_descs"]:
        chosen["spanish_descs"].sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
        best_desc = chosen["spanish_descs"][0][3]

    return chosen["work_id"], best_desc


def main():
    goodreads_books_file = GOODREADS_DIR / "goodreads_books.json"

    if not CATALOG_PATH.exists():
        print(f"Error: {CATALOG_PATH} not found. Run fetch_koha_catalog.py first.", file=sys.stderr)
        sys.exit(1)
    if not goodreads_books_file.exists():
        print(f"Error: {goodreads_books_file} not found.", file=sys.stderr)
        sys.exit(1)

    with open(CATALOG_PATH, "r", encoding="utf-8") as handle:
        koha_catalog = json.load(handle)

    koha_titles = {}
    collision_count = 0
    for book in koha_catalog:
        norm = normalize_title(book.get("title", ""))
        if not norm:
            continue
        if norm in koha_titles:
            collision_count += 1
            continue
        koha_titles[norm] = book

    print(f"Indexed {len(koha_titles)} unique normalized Koha titles ({collision_count} internal collisions skipped).")

    # Pass 1: gather candidate editions ONLY for titles present in Koha
    candidates_by_bib = collections.defaultdict(lambda: collections.defaultdict(list))
    total_scanned = 0
    json_errors = 0

    with open(goodreads_books_file, "r", encoding="utf-8") as handle:
        for line in handle:
            total_scanned += 1
            if total_scanned % 500000 == 0:
                print(f"  Pass 1 scanned {total_scanned} books...")
            try:
                gb = json.loads(line)
            except ValueError:
                json_errors += 1
                continue

            work_id = str(gb.get("work_id") or "").strip()
            book_id = str(gb.get("book_id") or "").strip()
            if not work_id or not book_id:
                continue

            matched_kb = None
            for raw_title in (gb.get("title"), gb.get("title_without_series")):
                norm = normalize_title(raw_title or "")
                if norm in koha_titles:
                    matched_kb = koha_titles[norm]
                    break
            if not matched_kb:
                continue

            try:
                ratings_count = int(gb.get("ratings_count") or 0)
            except ValueError:
                ratings_count = 0

            candidates_by_bib[matched_kb["biblio_id"]][work_id].append({
                "book_id": book_id,
                "title": gb.get("title", ""),
                "language_code": (gb.get("language_code") or "").strip(),
                "ratings_count": ratings_count,
                "description": gb.get("description", ""),
                "url": gb.get("url") or gb.get("link") or "",
            })

    print(f"Pass 1 done: scanned {total_scanned} books ({json_errors} bad JSON lines), {len(candidates_by_bib)} title candidates.")

    selected_work_to_bib = {}
    rejected_ambiguous = 0
    for kb in koha_catalog:
        bid = kb["biblio_id"]
        if bid not in candidates_by_bib:
            continue
        work_id, desc = select_best_work_and_description(kb, candidates_by_bib[bid])
        if not work_id:
            rejected_ambiguous += 1
            continue
        if work_id in selected_work_to_bib:
            continue
        selected_work_to_bib[work_id] = {
            "biblio_id": bid,
            "koha_title": kb["title"],
            "koha_author": kb.get("author", ""),
            "description": desc,
        }

    print(f"Verified {len(selected_work_to_bib)} strict 1-to-1 work matches (rejected {rejected_ambiguous} ambiguous/short homonyms).")

    # Pass 2: collect all Goodreads edition book_ids belonging strictly to selected works
    work_to_gr_bids = collections.defaultdict(list)
    with open(goodreads_books_file, "r", encoding="utf-8") as handle:
        for line in handle:
            try:
                gb = json.loads(line)
            except ValueError:
                continue
            wid = str(gb.get("work_id") or "").strip()
            bid = str(gb.get("book_id") or "").strip()
            if wid in selected_work_to_bib and bid:
                work_to_gr_bids[wid].append(bid)

    work_to_koha = {}
    all_gr_book_ids = set()
    with_desc = 0
    for wid, info in selected_work_to_bib.items():
        gr_bids = sorted(set(work_to_gr_bids.get(wid, [])))
        all_gr_book_ids.update(gr_bids)
        if info["description"]:
            with_desc += 1
        work_to_koha[wid] = {
            "biblio_id": info["biblio_id"],
            "koha_title": info["koha_title"],
            "koha_author": info["koha_author"],
            "description": info["description"],
            "gr_book_ids": gr_bids,
        }

    write_json_atomic(MAPPING_PATH, {
        "work_to_koha": work_to_koha,
        "all_gr_book_ids": sorted(all_gr_book_ids),
    })
    print(f"Saved {len(work_to_koha)} verified matches ({with_desc} with clean Spanish descriptions) to {MAPPING_PATH}.")


if __name__ == "__main__":
    main()
