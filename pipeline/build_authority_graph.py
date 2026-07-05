"""
Build the authority-based book connection graph from the Koha catalog data.

Reads:  data/koha/catalog.json
Writes: data/koha/authority_graph.json
"""

import json
import os
from collections import defaultdict

INPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "koha", "catalog.json")
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "koha", "authority_graph.json")


def main():
    print("=" * 60)
    print("Authority Graph Builder — Jardín LAC Vizcaínas")
    print("=" * 60)

    # Step 1: Load catalog
    print("\n[1/4] Loading catalog data...")
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    print(f"  ✓ Loaded {len(catalog)} books.")

    # Step 2: Build authority index
    # authority_id → { name, type, biblio_ids: set }
    print("\n[2/4] Building authority index...")
    authority_index = {}
    book_authorities = {}  # biblio_id → set of authority_ids

    for book in catalog:
        bid = book["biblio_id"]
        book_authorities[bid] = set()

        for auth in book["authorities"]:
            aid = auth["authority_id"]
            book_authorities[bid].add(aid)

            if aid not in authority_index:
                authority_index[aid] = {
                    "authority_id": aid,
                    "name": auth["name"],
                    "type": auth["type"],
                    "biblio_ids": set(),
                }
            authority_index[aid]["biblio_ids"].add(bid)

    # Filter out authorities that only link to a single book (no connections)
    multi_link_auths = {aid: auth for aid, auth in authority_index.items() if len(auth["biblio_ids"]) >= 2}

    print(f"  ✓ Found {len(authority_index)} unique authorities.")
    print(f"  ✓ {len(multi_link_auths)} authorities link ≥2 books (useful for connections).")

    # Authority type breakdown
    type_counts = defaultdict(int)
    for auth in authority_index.values():
        type_counts[auth["type"]] += 1
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"      {t}: {c}")

    # Step 3: Compute book-to-book connections
    print("\n[3/4] Computing book-to-book connections via shared authorities...")
    connections = defaultdict(lambda: {"weight": 0, "shared_authority_ids": []})

    for aid, auth in multi_link_auths.items():
        bids = sorted(auth["biblio_ids"])
        for i in range(len(bids)):
            for j in range(i + 1, len(bids)):
                key = (bids[i], bids[j])
                connections[key]["weight"] += 1
                connections[key]["shared_authority_ids"].append(aid)

    print(f"  ✓ Found {len(connections)} total book-to-book connections.")

    # Connection weight distribution
    weight_dist = defaultdict(int)
    for conn in connections.values():
        weight_dist[conn["weight"]] += 1
    print("  Weight distribution:")
    for w in sorted(weight_dist.keys()):
        print(f"    {w} shared authorities: {weight_dist[w]} pairs")

    # Filter to weight >= 3 (meaningful connections only)
    MIN_WEIGHT = 3
    strong_connections = {k: v for k, v in connections.items() if v["weight"] >= MIN_WEIGHT}
    print(f"  ✓ Keeping {len(strong_connections)} connections with weight ≥ {MIN_WEIGHT}.")

    # Step 4: Build and save output
    print("\n[4/4] Building output data structure...")

    # Books list with metadata
    book_index = {}
    for book in catalog:
        bid = book["biblio_id"]
        book_index[bid] = {
            "biblio_id": bid,
            "title": book["title"],
            "author": book["author"],
            "authorities": book["authorities"],
        }

    # Authorities list (serializable) — only those that link ≥2 books
    authorities_list = []
    for aid, auth in sorted(multi_link_auths.items(), key=lambda x: x[1]["name"]):
        authorities_list.append({
            "authority_id": aid,
            "name": auth["name"],
            "type": auth["type"],
            "book_count": len(auth["biblio_ids"]),
            "biblio_ids": sorted(auth["biblio_ids"]),
        })

    # Connections list (serializable)
    connections_list = []
    for (bid1, bid2), conn in strong_connections.items():
        connections_list.append({
            "source": bid1,
            "target": bid2,
            "weight": conn["weight"],
            "shared_authority_ids": conn["shared_authority_ids"],
        })


    # Sort connections by weight descending
    connections_list.sort(key=lambda x: -x["weight"])

    # Top connecting authorities (those that link the most books)
    top_authorities = sorted(
        multi_link_auths.values(),
        key=lambda a: -len(a["biblio_ids"])
    )[:30]

    output = {
        "stats": {
            "total_books": len(catalog),
            "total_authorities": len(authority_index),
            "connecting_authorities": len(multi_link_auths),
            "total_connections": len(connections_list),
            "type_counts": dict(type_counts),
        },
        "books": book_index,
        "authorities": authorities_list,
        "connections": connections_list,
        "top_authorities": [
            {
                "authority_id": a["authority_id"],
                "name": a["name"],
                "type": a["type"],
                "book_count": len(a["biblio_ids"]),
            }
            for a in top_authorities
        ],
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  ✓ Saved authority graph to {OUTPUT_PATH}")
    print(f"  File size: {os.path.getsize(OUTPUT_PATH) / (1024*1024):.1f} MB")
    print("=" * 60)


if __name__ == "__main__":
    main()
