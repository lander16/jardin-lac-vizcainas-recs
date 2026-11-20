import random
import sys
import unittest
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent.parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

import build_authority_graph  # noqa: E402
import clean_catalog  # noqa: E402
import config  # noqa: E402
import embed_books  # noqa: E402
import fetch_koha_catalog  # noqa: E402
import generate_names  # noqa: E402
import match_koha_goodreads  # noqa: E402
import select_koha_users  # noqa: E402


class PipelineTests(unittest.TestCase):
    def test_fetch_prefers_999c_and_preserves_initials(self):
        marc = {
            "fields": [
                {"001": "8000"},
                {"245": {"subfields": [{"a": "Harry Potter /"}, {"b": "la piedra filosofal."}]}},
                {"100": {"subfields": [{"a": "Rowling, J. K.,"}, {"9": "10"}]}},
                {"650": {"subfields": [{"a": "Magia /"}, {"x": "Ficción."}, {"9": "20"}]}},
                {"650": {"subfields": [{"a": "   "}, {"9": "99"}]}},
                {"999": {"subfields": [{"c": "6993"}]}},
            ]
        }
        parsed = fetch_koha_catalog.parse_marc_record(marc)
        self.assertEqual(parsed["biblio_id"], "6993")
        self.assertEqual(parsed["title"], "Harry Potter: la piedra filosofal")
        self.assertEqual(parsed["author"], "Rowling, J. K.")
        self.assertEqual([a["name"] for a in parsed["authorities"]], ["Rowling, J. K.", "Magia -- Ficción"])

    def test_clean_catalog_repairs_8000_collision_test_records_and_duplicates(self):
        raw = [
            {
                "biblio_id": "8000",
                "title": "Amado  Una vida disociada",
                "author": "",
                "authorities": [
                    {"authority_id": "17119", "name": "Cabrales,  Amado", "type": "Autor", "marc_field": "100"},
                    {"authority_id": "27831", "name": "", "type": "Tema", "marc_field": "650"},
                    {"authority_id": "20086", "name": "Hernandez, Saul", "type": "Autor", "marc_field": "700"},
                ],
            },
            {
                "biblio_id": "8000",
                "title": "La era del capitalismo de la vigilancia",
                "author": "Zuboff, Shoshana",
                "authorities": [
                    {"authority_id": "15632", "name": "Hernández, Saúl", "type": "Tema (Persona)", "marc_field": "600"},
                    {"authority_id": "15632", "name": "Hernández, Saúl", "type": "Tema (Persona)", "marc_field": "600"},
                ],
            },
            {"biblio_id": "6712", "title": "Prueba", "author": "", "authorities": []},
        ]
        cleaned, stats = clean_catalog.clean_catalog_records(raw)
        self.assertEqual([b["biblio_id"] for b in cleaned], ["6993", "8000"])
        self.assertEqual(stats["reassigned_8000_to_6993"], 1)
        self.assertEqual(stats["removed_test_records"], 1)
        self.assertEqual(cleaned[0]["author"], "Cabrales, Amado")
        self.assertEqual(cleaned[0]["title"], "Amado Una vida disociada")
        self.assertEqual([a["name"] for a in cleaned[0]["authorities"]], ["Cabrales, Amado", "Hernández, Saúl"])
        self.assertEqual(len(cleaned[1]["authorities"]), 1)

    def test_match_rejects_ambiguous_short_homonyms_and_cleans_descriptions(self):
        cleaned = match_koha_goodreads.clean_description(
            "&&LDIV&&R<<Novela>> <p>sobre la historia&#8212;moderna\x01</p>\nLibrarian note: skip this"
        )
        self.assertEqual(cleaned, "«Novela» sobre la historia—moderna")

        koha_book = {"biblio_id": "1702", "title": "Inferno", "author": "Strindberg, August"}
        editions = {
            "w1": [{"book_id": "1", "title": "Inferno", "language_code": "ind", "ratings_count": 5000, "description": "Dan Brown thriller", "url": ""}],
            "w2": [{"book_id": "2", "title": "Inferno", "language_code": "eng", "ratings_count": 9000, "description": "Dante Alighieri poem", "url": ""}],
        }
        wid, desc = match_koha_goodreads.select_best_work_and_description(koha_book, editions)
        self.assertIsNone(wid)
        self.assertEqual(desc, "")

        # Verified surname + Spanish description passes cleanly
        editions["w3"] = [{
            "book_id": "3",
            "title": "Inferno",
            "language_code": "spa",
            "ratings_count": 400,
            "description": "Obra autobiografica de August Strindberg escrita en Paris sobre la crisis espiritual del autor y su tiempo.",
            "url": "",
        }]
        wid, desc = match_koha_goodreads.select_best_work_and_description(koha_book, editions)
        self.assertEqual(wid, "w3")
        self.assertIn("Strindberg", desc)

    def test_select_koha_users_dates_and_generate_names_uniqueness(self):
        rng = random.Random(42)
        for _ in range(50):
            dt = select_koha_users.generate_checkout_date(rng)
            self.assertLessEqual(dt, "2026-06-30 23:59:59")

        profiles = generate_names.generate_patron_profiles([f"user_{i}" for i in range(120)])
        emails = [p["email"] for p in profiles.values()]
        cards = [p["cardnumber"] for p in profiles.values()]
        self.assertEqual(len(emails), len(set(emails)))
        self.assertEqual(len(cards), len(set(cards)))

    def test_authority_graph_suppresses_mega_umbrella_and_keeps_rare_author(self):
        catalog = [
            {
                "biblio_id": "1",
                "authorities": [
                    {"authority_id": "mega", "name": "Autoras", "type": "Tema"},
                    {"authority_id": "auth1", "name": "Rulfo, Juan", "type": "Autor"},
                ],
            },
            {
                "biblio_id": "2",
                "authorities": [
                    {"authority_id": "mega", "name": "Autoras", "type": "Tema"},
                    {"authority_id": "auth1", "name": "Rulfo, Juan", "type": "Autor"},
                ],
            },
            {
                "biblio_id": "3",
                "authorities": [{"authority_id": "mega", "name": "Autoras", "type": "Tema"}],
            },
        ]
        result = build_authority_graph.compute_authority_connections(catalog, max_df=2, max_single_df=5)
        self.assertEqual(len(result["connections"]), 1)
        self.assertEqual((result["connections"][0]["source"], result["connections"][0]["target"]), ("1", "2"))

    def test_embed_books_build_text_places_specific_subjects_before_description(self):
        book = {
            "title": "Pedro Páramo",
            "author": "Rulfo, Juan",
            "authorities": [
                {"authority_id": "1", "name": "Rulfo, Juan"},
                {"authority_id": "2", "name": "Autoras"},
                {"authority_id": "3", "name": "Realismo mágico"},
            ],
        }
        text = embed_books.build_text(
            book,
            description="X" * 500,
            authority_df={"1": 5, "2": 1900, "3": 12},
        )
        self.assertIn("Realismo mágico; Autoras", text)
        self.assertLess(text.index("Realismo mágico"), text.index("XXX"))
        self.assertNotIn("Rulfo, Juan; ", text)


if __name__ == "__main__":
    unittest.main()
