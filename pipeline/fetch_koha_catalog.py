"""
Fetch all bibliographic records from the Koha REST API and extract
linked authorities from MARC-in-JSON data.

Outputs: data/koha/catalog.json
"""

import urllib.request
import urllib.parse
import base64
import json
import os
import sys
import time

# --- Configuration ---
CLIENT_ID = "5e9144be-9811-4a5b-b3b8-22be7e6d8fd6"
CLIENT_SECRET = "695aebc6-c58c-4823-bc9e-9bdd96b088e1"
BASE_URL = "https://adminvizcainas.xelibrary.com/api/v1"
TOKEN_URL = f"{BASE_URL}/oauth/token"

# Batch size and throttle to avoid overloading the server
PER_PAGE = 50
THROTTLE_SECONDS = 0.5

# MARC fields to extract authorities from, mapped to human-readable type names
AUTHORITY_FIELD_MAP = {
    "100": "Autor",
    "110": "Corporativo",
    "130": "Título Uniforme",
    "600": "Tema (Persona)",
    "610": "Tema (Corporativo)",
    "630": "Título Uniforme",
    "650": "Tema",
    "651": "Lugar",
    "700": "Autor",
    "710": "Corporativo",
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "koha")


def get_access_token():
    """Authenticate with OAuth2 client credentials and return the access token."""
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")

    try:
        req = urllib.request.Request(TOKEN_URL, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as response:
            parsed = json.loads(response.read().decode("utf-8"))
            token = parsed.get("access_token")
            if not token:
                print("ERROR: No access_token in response:", parsed)
                sys.exit(1)
            return token
    except Exception as e:
        print(f"ERROR: Failed to authenticate: {e}")
        sys.exit(1)


def fetch_all_biblios(token):
    """
    Fetch all bibliographic records from /api/v1/biblios in MARC-in-JSON format.
    Uses pagination and a throttle delay between requests.
    """
    all_biblios = []
    page = 1

    while True:
        url = f"{BASE_URL}/biblios?_page={page}&_per_page={PER_PAGE}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/marc-in-json",
        }

        req = urllib.request.Request(url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(req) as response:
                raw = response.read().decode("utf-8")
                data = json.loads(raw)

                if not data:
                    break

                # The response may be a single object or a list
                if isinstance(data, dict):
                    all_biblios.append(data)
                elif isinstance(data, list):
                    all_biblios.extend(data)
                else:
                    print(f"  WARNING: Unexpected response type on page {page}: {type(data)}")
                    break

                count = len(data) if isinstance(data, list) else 1
                print(f"  Page {page}: fetched {count} records (total so far: {len(all_biblios)})")

                if count < PER_PAGE:
                    break

                page += 1
                time.sleep(THROTTLE_SECONDS)

        except urllib.error.HTTPError as e:
            # If we get a 404 or similar, we've exhausted the pages
            if e.code == 404:
                print(f"  Page {page}: 404 — no more records.")
                break
            print(f"  ERROR on page {page}: HTTP {e.code} — {e.reason}")
            # Try to continue with next page
            page += 1
            time.sleep(THROTTLE_SECONDS)
        except Exception as e:
            print(f"  ERROR on page {page}: {e}")
            break

    return all_biblios


def extract_subfield(subfields, code):
    """Extract the value of a specific subfield code from a MARC subfields array."""
    for sf in subfields:
        if isinstance(sf, dict) and code in sf:
            return sf[code]
    return None


def parse_marc_record(marc_json):
    """
    Parse a MARC-in-JSON record and extract:
    - biblio_id (from field 999 $c or 001)
    - title (from field 245 $a + $b)
    - author (from field 100 $a)
    - linked authorities (from AUTHORITY_FIELD_MAP fields, only those with $9)
    """
    fields = marc_json.get("fields", [])

    biblio_id = None
    title = ""
    subtitle = ""
    author = ""
    authorities = []

    for field_obj in fields:
        for tag, content in field_obj.items():
            # Control fields (001, 003, etc.) are strings
            if isinstance(content, str):
                if tag == "001":
                    biblio_id = content.strip()
                continue

            # Data fields have subfields
            subfields = content.get("subfields", [])

            if tag == "245":
                title = extract_subfield(subfields, "a") or ""
                subtitle = extract_subfield(subfields, "b") or ""

            if tag == "100" and not author:
                author = extract_subfield(subfields, "a") or ""

            # Extract authorities from mapped fields
            if tag in AUTHORITY_FIELD_MAP:
                auth_id = extract_subfield(subfields, "9")
                # Only include formally linked authorities (those with $9)
                if auth_id:
                    auth_name = extract_subfield(subfields, "a") or ""
                    auth_type = AUTHORITY_FIELD_MAP[tag]

                    # Clean up trailing punctuation from MARC cataloging
                    auth_name = auth_name.rstrip(" ,.-/;:")

                    authorities.append({
                        "authority_id": str(auth_id),
                        "name": auth_name,
                        "type": auth_type,
                        "marc_field": tag,
                    })

            # Fallback: extract biblio_id from field 999 $c (Koha internal)
            if tag == "999":
                candidate = extract_subfield(subfields, "c")
                if candidate and not biblio_id:
                    biblio_id = str(candidate).strip()

    # Clean up title
    full_title = title.rstrip(" /,;:.")
    if subtitle:
        full_title += " " + subtitle.rstrip(" /,;:.")

    return {
        "biblio_id": biblio_id,
        "title": full_title.strip(),
        "author": author.rstrip(" ,.-/;:"),
        "authorities": authorities,
    }


def main():
    print("=" * 60)
    print("Koha Catalog Fetcher — Jardín LAC Vizcaínas")
    print("=" * 60)

    # Step 1: Authenticate
    print("\n[1/3] Authenticating with Koha API...")
    token = get_access_token()
    print("  ✓ Access token obtained.")

    # Step 2: Fetch all biblios
    print(f"\n[2/3] Fetching all bibliographic records (batch size: {PER_PAGE})...")
    raw_biblios = fetch_all_biblios(token)
    print(f"  ✓ Fetched {len(raw_biblios)} raw MARC records.")

    # Step 3: Parse MARC records
    print("\n[3/3] Parsing MARC-in-JSON records and extracting authorities...")
    catalog = []
    skipped = 0

    for marc_json in raw_biblios:
        parsed = parse_marc_record(marc_json)
        if parsed["biblio_id"] and parsed["title"]:
            catalog.append(parsed)
        else:
            skipped += 1

    print(f"  ✓ Parsed {len(catalog)} books ({skipped} skipped due to missing ID or title).")

    # Compute stats
    total_authorities = sum(len(b["authorities"]) for b in catalog)
    unique_auth_ids = set()
    type_counts = {}
    for book in catalog:
        for auth in book["authorities"]:
            unique_auth_ids.add(auth["authority_id"])
            t = auth["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n  Summary:")
    print(f"    Books: {len(catalog)}")
    print(f"    Total authority links: {total_authorities}")
    print(f"    Unique authorities: {len(unique_auth_ids)}")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"      {t}: {c}")

    # Save output
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "catalog.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    print(f"\n  ✓ Saved to {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
