"""
Fetch all bibliographic records from the Koha REST API and extract
linked authorities from MARC-in-JSON data.

Outputs: data/koha/catalog.json
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from .config import CATALOG_PATH, clean_marc_name, clean_whitespace, write_json_atomic
except ImportError:
    from config import CATALOG_PATH, clean_marc_name, clean_whitespace, write_json_atomic

DEFAULT_BASE_URL = "https://adminvizcainas.xelibrary.com/api/v1"
PER_PAGE = 50
THROTTLE_SECONDS = 0.5
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 4

AUTHORITY_FIELD_MAP = {
    "100": "Autor",
    "110": "Corporativo",
    "130": "Título Uniforme",
    "600": "Tema (Persona)",
    "610": "Tema (Corporativo)",
    "630": "Título Uniforme",
    "650": "Tema",
    "651": "Lugar",
    "655": "Tema",
    "700": "Autor",
    "710": "Corporativo",
}

AUTHOR_FALLBACK_ORDER = ("100", "700", "110", "710")


def get_access_token(base_url, client_id, client_secret):
    """Authenticate with OAuth2 client credentials and return the access token."""
    auth_str = f"{client_id}:{client_secret}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")
    token_url = f"{base_url}/oauth/token"

    try:
        req = urllib.request.Request(token_url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            parsed = json.loads(response.read().decode("utf-8"))
            token = parsed.get("access_token")
            if not token:
                raise RuntimeError(f"No access_token in response: {parsed}")
            return token
    except Exception as exc:
        raise RuntimeError(f"Failed to authenticate against Koha API: {exc}") from exc


def fetch_all_biblios(base_url, client_id, client_secret):
    """
    Fetch all bibliographic records from /api/v1/biblios in MARC-in-JSON format.
    Refreshes expired OAuth tokens on 401 and retries transient errors with backoff.
    """
    token = get_access_token(base_url, client_id, client_secret)
    all_biblios = []
    page = 1

    while True:
        url = f"{base_url}/biblios?_page={page}&_per_page={PER_PAGE}"
        page_data = None

        for attempt in range(1, MAX_RETRIES + 1):
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/marc-in-json",
            }
            req = urllib.request.Request(url, headers=headers, method="GET")
            try:
                with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                    page_data = json.loads(response.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                if exc.code == 404:
                    print(f"  Page {page}: 404 — no more records.")
                    return all_biblios
                if exc.code == 401 and attempt < MAX_RETRIES:
                    print(f"  Page {page}: HTTP 401 — refreshing OAuth token...")
                    token = get_access_token(base_url, client_id, client_secret)
                    continue
                if exc.code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    retry_after = exc.headers.get("Retry-After") if exc.headers else None
                    delay = float(retry_after) if retry_after and retry_after.isdigit() else (2 ** attempt)
                    print(f"  Page {page}: HTTP {exc.code} — retrying in {delay}s ({attempt}/{MAX_RETRIES})...")
                    time.sleep(delay)
                    continue
                raise RuntimeError(f"Koha API failed on page {page}: HTTP {exc.code} — {exc.reason}") from exc
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                if attempt < MAX_RETRIES:
                    delay = 2 ** attempt
                    print(f"  Page {page}: transient error ({exc}) — retrying in {delay}s ({attempt}/{MAX_RETRIES})...")
                    time.sleep(delay)
                    continue
                raise RuntimeError(f"Koha API failed on page {page} after {MAX_RETRIES} retries: {exc}") from exc

        if not page_data:
            break

        if isinstance(page_data, dict):
            all_biblios.append(page_data)
            count = 1
        elif isinstance(page_data, list):
            all_biblios.extend(page_data)
            count = len(page_data)
        else:
            raise RuntimeError(f"Unexpected response type on page {page}: {type(page_data)}")

        print(f"  Page {page}: fetched {count} records (total so far: {len(all_biblios)})")
        if count < PER_PAGE:
            break

        page += 1
        time.sleep(THROTTLE_SECONDS)

    return all_biblios


def extract_subfield(subfields, code):
    """Extract the first value for a given subfield code from a MARC subfields list."""
    for sf in subfields:
        if isinstance(sf, dict) and code in sf:
            return sf[code]
    return None


def extract_subfields(subfields, codes):
    """Extract ordered subfield values for any code in `codes`."""
    values = []
    for sf in subfields:
        if not isinstance(sf, dict):
            continue
        for code, val in sf.items():
            if code in codes and val:
                values.append(str(val))
    return values


def _clean_title_segment(raw):
    cleaned = clean_whitespace(raw)
    cleaned = re.sub(r"[\s/,;:]+$", "", cleaned)
    if cleaned.endswith(".") and not re.search(r"(?:^|[\s.])[A-ZÁÉÍÓÚÜÑ]\.$", cleaned):
        cleaned = cleaned.rstrip(".").strip()
    return cleaned


def parse_marc_record(marc_json):
    """
    Parse a MARC-in-JSON record and extract:
    - biblio_id (preferring Koha internal 999 $c over 001)
    - title (from field 245 $a $n $p + $b)
    - author (from field 100 $a, falling back to 700/110/710 authorities)
    - isbn, summary (520 $a) when present
    - deduplicated linked authorities (requiring non-empty name and $9)
    """
    import re as _re  # keep local import free of global state if called standalone

    fields = marc_json.get("fields", [])

    control_001 = None
    koha_999c = None
    title_parts = []
    subtitle = ""
    author = ""
    isbn = None
    summary_parts = []
    authorities = []
    seen_auth_keys = set()

    for field_obj in fields:
        for tag, content in field_obj.items():
            if isinstance(content, str):
                if tag == "001" and content.strip():
                    control_001 = content.strip()
                continue

            subfields = content.get("subfields", [])

            if tag == "020" and not isbn:
                raw_isbn = extract_subfield(subfields, "a") or ""
                digits = _re.sub(r"[^0-9Xx]", "", raw_isbn.split()[0] if raw_isbn else "")
                if len(digits) in (10, 13):
                    isbn = digits.upper()

            if tag == "245":
                title_parts = extract_subfields(subfields, {"a", "n", "p"})
                subtitle = extract_subfield(subfields, "b") or ""

            if tag == "100" and not author:
                author = clean_marc_name(extract_subfield(subfields, "a") or "")

            if tag == "520":
                s = clean_whitespace(" ".join(extract_subfields(subfields, {"a", "b"})))
                if s:
                    summary_parts.append(s)

            if tag in AUTHORITY_FIELD_MAP:
                auth_id = extract_subfield(subfields, "9")
                if auth_id:
                    name_parts = [clean_marc_name(extract_subfield(subfields, "a") or "")]
                    for sub_code in ("x", "y", "z", "v"):
                        for sub_val in extract_subfields(subfields, {sub_code}):
                            cleaned_sub = clean_marc_name(sub_val, preserve_initials=False)
                            if cleaned_sub:
                                name_parts.append(cleaned_sub)
                    auth_name = " -- ".join(p for p in name_parts if p)
                    if not auth_name:
                        continue

                    auth_id_str = str(auth_id).strip()
                    dedup_key = (auth_id_str, tag)
                    if dedup_key in seen_auth_keys:
                        continue
                    seen_auth_keys.add(dedup_key)

                    authorities.append({
                        "authority_id": auth_id_str,
                        "name": auth_name,
                        "type": AUTHORITY_FIELD_MAP[tag],
                        "marc_field": tag,
                    })

            if tag == "999":
                candidate = extract_subfield(subfields, "c")
                if candidate and not koha_999c:
                    koha_999c = str(candidate).strip()

    biblio_id = koha_999c or control_001

    main_title = " ".join(_clean_title_segment(p) for p in title_parts if p)
    clean_sub = _clean_title_segment(subtitle)
    full_title = f"{main_title}: {clean_sub}" if (main_title and clean_sub) else (main_title or clean_sub)

    if not author:
        for fallback_tag in AUTHOR_FALLBACK_ORDER:
            match = next((a["name"] for a in authorities if a["marc_field"] == fallback_tag), None)
            if match:
                author = match
                break

    record = {
        "biblio_id": biblio_id,
        "title": clean_whitespace(full_title),
        "author": author,
        "authorities": authorities,
    }
    if isbn:
        record["isbn"] = isbn
    if summary_parts:
        record["summary"] = " ".join(summary_parts)
    return record


import re  # noqa: E402


def main():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    client_id = os.environ.get("KOHA_CLIENT_ID")
    client_secret = os.environ.get("KOHA_CLIENT_SECRET")
    if not client_id or not client_secret:
        print("ERROR: KOHA_CLIENT_ID and KOHA_CLIENT_SECRET must be set.", file=sys.stderr)
        sys.exit(1)

    base_url = os.environ.get("KOHA_BASE_URL", DEFAULT_BASE_URL).rstrip("/")

    print("=" * 60)
    print("Koha Catalog Fetcher — Jardín LAC Vizcaínas")
    print("=" * 60)

    raw_biblios = fetch_all_biblios(base_url, client_id, client_secret)
    print(f"  ✓ Fetched {len(raw_biblios)} raw MARC records.")

    by_id = {}
    skipped = 0
    for marc_json in raw_biblios:
        parsed = parse_marc_record(marc_json)
        bid = parsed.get("biblio_id")
        if bid and parsed.get("title"):
            if bid in by_id:
                print(f"  WARNING: duplicate biblio_id {bid}; keeping first.", file=sys.stderr)
                continue
            by_id[bid] = parsed
        else:
            skipped += 1

    catalog = list(by_id.values())
    print(f"  ✓ Parsed {len(catalog)} unique books ({skipped} skipped).")
    write_json_atomic(CATALOG_PATH, catalog)
    print(f"  ✓ Saved to {Path(CATALOG_PATH)}")


if __name__ == "__main__":
    main()
