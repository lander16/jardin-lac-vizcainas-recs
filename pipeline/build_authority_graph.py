"""
Build the authority-based book connection graph from the Koha catalog data
using Adamic-Adar / IDF weighting to suppress mega-hub umbrella distortion.

Reads:  data/koha/catalog.json
Writes: data/koha/authority_graph.json
"""

import collections
import json
import math
import os
import sys

try:
    from .config import AUTHORITY_GRAPH_PATH, CATALOG_PATH, write_json_atomic
except ImportError:
    from config import AUTHORITY_GRAPH_PATH, CATALOG_PATH, write_json_atomic

MAX_DF_FOR_EDGES = 400
MAX_SINGLE_AUTHORITY_DF = 20
TOP_CONNECTIONS_PER_BOOK = 30


def compute_authority_connections(
    catalog,
    *,
    max_df=MAX_DF_FOR_EDGES,
    max_single_df=MAX_SINGLE_AUTHORITY_DF,
    top_k_per_book=TOP_CONNECTIONS_PER_BOOK,
):
    authority_index = {}
    for book in catalog:
        bid = str(book["biblio_id"])
        for auth in book.get("authorities") or []:
            name = (auth.get("name") or "").strip()
            if not name:
                continue
            aid = str(auth["authority_id"])
            if aid not in authority_index:
                authority_index[aid] = {
                    "authority_id": aid,
                    "name": name,
                    "type": auth.get("type", ""),
                    "biblio_ids": set(),
                }
            authority_index[aid]["biblio_ids"].add(bid)

    multi_link_auths = {aid: a for aid, a in authority_index.items() if len(a["biblio_ids"]) >= 2}

    pair_scores = collections.defaultdict(float)
    pair_shared_counts = collections.defaultdict(int)
    pair_min_df = {}

    for aid, auth in multi_link_auths.items():
        df = len(auth["biblio_ids"])
        if df > max_df:
            continue
        idf_weight = 1.0 / math.log2(1.0 + df)
        bids = sorted(auth["biblio_ids"])
        for i in range(len(bids)):
            b1 = bids[i]
            for j in range(i + 1, len(bids)):
                key = (b1, bids[j])
                pair_scores[key] += idf_weight
                pair_shared_counts[key] += 1
                prev = pair_min_df.get(key)
                if prev is None or df < prev:
                    pair_min_df[key] = df

    # Filter out weak 1-shared-broad-tag edges; keep >=2 shared tags OR rare 1-tag match (df <= max_single_df)
    eligible = {}
    per_book = collections.defaultdict(list)
    for key, score in pair_scores.items():
        if pair_shared_counts[key] < 2 and pair_min_df[key] > max_single_df:
            continue
        eligible[key] = max(1, round(score * 100))
        b1, b2 = key
        per_book[b1].append((eligible[key], b2, key))
        per_book[b2].append((eligible[key], b1, key))

    kept_keys = set()
    for _bid, neighbors in per_book.items():
        neighbors.sort(key=lambda item: (-item[0], item[1]))
        for _, _, key in neighbors[:top_k_per_book]:
            kept_keys.add(key)

    connections_list = [
        {"source": b1, "target": b2, "weight": eligible[(b1, b2)]}
        for (b1, b2) in kept_keys
    ]
    connections_list.sort(key=lambda item: (-item["weight"], item["source"], item["target"]))

    type_counts = collections.Counter(a["type"] for a in authority_index.values())
    top_authorities = sorted(multi_link_auths.values(), key=lambda a: (-len(a["biblio_ids"]), a["name"]))[:30]

    return {
        "stats": {
            "total_books": len(catalog),
            "total_authorities": len(authority_index),
            "connecting_authorities": len(multi_link_auths),
            "total_connections": len(connections_list),
            "type_counts": dict(type_counts),
        },
        "top_authorities": [
            {
                "authority_id": a["authority_id"],
                "name": a["name"],
                "type": a["type"],
                "book_count": len(a["biblio_ids"]),
            }
            for a in top_authorities
        ],
        "connections": connections_list,
    }


def main():
    if not CATALOG_PATH.exists():
        print(f"Error: {CATALOG_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    with open(CATALOG_PATH, "r", encoding="utf-8") as handle:
        catalog = json.load(handle)

    output = compute_authority_connections(catalog)
    write_json_atomic(AUTHORITY_GRAPH_PATH, output)
    size_mb = os.path.getsize(AUTHORITY_GRAPH_PATH) / (1024 * 1024)
    print(f"Saved {len(output['connections'])} weighted connections to {AUTHORITY_GRAPH_PATH} ({size_mb:.1f} MB).")


if __name__ == "__main__":
    main()
