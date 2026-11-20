"""Build user-user Jaccard similarity graph from checkout history and patron names."""

import csv
import json
import sys

try:
    from .config import CHECKOUTS_PATH, PATRON_NAMES_PATH, USER_GRAPH_PATH, write_json_atomic
except ImportError:
    from config import CHECKOUTS_PATH, PATRON_NAMES_PATH, USER_GRAPH_PATH, write_json_atomic

TOP_SIMILAR_USERS = 30


def compute_user_graph(user_checkouts, patron_names, top_k=TOP_SIMILAR_USERS):
    user_ids = sorted(user_checkouts.keys())
    sims_by_user = {uid: [] for uid in user_ids}

    for i, u1 in enumerate(user_ids):
        u1_books = user_checkouts[u1]
        for u2 in user_ids[i + 1:]:
            u2_books = user_checkouts[u2]
            intersection = u1_books & u2_books
            if not intersection:
                continue
            union_size = len(u1_books | u2_books)
            jaccard = len(intersection) / union_size
            shared = sorted(intersection)

            u2_name = patron_names.get(u2, {}).get("name", f"User {u2[:8]}")
            u1_name = patron_names.get(u1, {}).get("name", f"User {u1[:8]}")

            sims_by_user[u1].append({
                "user_id": u2,
                "name": u2_name,
                "similarity": jaccard,
                "shared_books": shared,
            })
            sims_by_user[u2].append({
                "user_id": u1,
                "name": u1_name,
                "similarity": jaccard,
                "shared_books": shared,
            })

    graph = {}
    for uid in user_ids:
        peers = sorted(sims_by_user[uid], key=lambda item: (-item["similarity"], item["user_id"]))
        name = patron_names.get(uid, {}).get("name", f"User {uid[:8]}")
        graph[uid] = {
            "user_id": uid,
            "name": name,
            "checkouts": sorted(user_checkouts[uid]),
            "similar_users": peers[:top_k],
        }
    return graph


def main():
    if not CHECKOUTS_PATH.exists():
        print(f"Error: {CHECKOUTS_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    patron_names = {}
    if PATRON_NAMES_PATH.exists():
        with open(PATRON_NAMES_PATH, mode="r", encoding="utf-8") as handle:
            patron_names = json.load(handle)

    user_checkouts = {}
    with open(CHECKOUTS_PATH, mode="r", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            user_checkouts.setdefault(row["user_id"], set()).add(row["book_id"])

    user_graph_data = compute_user_graph(user_checkouts, patron_names)
    write_json_atomic(USER_GRAPH_PATH, user_graph_data)
    print(f"Saved user graph ({len(user_graph_data)} patrons) -> {USER_GRAPH_PATH}")


if __name__ == "__main__":
    main()
