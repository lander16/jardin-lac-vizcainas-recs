# frozen_string_literal: true

require "test_helper"

# Integration test for the catalog search pipeline against a realistic
# dataset. The original test suite's setup only created 3 books
# (Siddhartha, Demian, Pedro Páramo), which was too small to reproduce
# the FTS5-vs-LIKE-cap interaction that caused the empty-search bug
# (searching for "shakespeare" on Render returned 0 results because
# FTS5's noisy common-trigram matches displaced the real targets in
# the 50-candidate cap). This test creates a realistic dataset that
# can reproduce the cap interaction.
class CatalogSearchIntegrationTest < ActionDispatch::IntegrationTest
  def fake_embedder(available:)
    fake = Object.new
    fake.instance_variable_set(:@available, available)
    fake.define_singleton_method(:available?) { @available }
    fake.define_singleton_method(:encode) { |_t| nil }
    fake
  end

  # Insert a book_word and remember it so we can bulk-rebuild FTS5
  # once at the end of setup. Calling rebuild_from_book_words! per
  # word (70+ times per test) is slow AND races with the previous
  # test's stale FTS5 entries, causing UNIQUE-constraint failures.
  def index_word(book, word, source:)
    BookWord.find_or_create_by!(book_id: book.id, word: word, source: source)
    @words_to_index ||= []
    @words_to_index << [ book.id, word, source ]
  end

  setup do
    # Defensive cleanup: if a previous run was killed mid-test, the
    # teardown didn't run and the DB is polluted. Wipe the slate.
    BookAuthority.delete_all
    BookWord.delete_all
    Authority.delete_all
    Book.delete_all

    # --- 7 Shakespeare-author books (the LIKE-exact targets) ---
    @shakespeare_works = [
      [ "hamlet_shakespeare",      "Hamlet",                          "Shakespeare, William" ],
      [ "macbeth_shakespeare",     "Macbeth",                         "Shakespeare, William" ],
      [ "romeo_shakespeare",      "Romeo y Julieta",                  "Shakespeare, William" ],
      [ "lear_shakespeare",        "El rey Lear",                      "Shakespeare, William" ],
      [ "tempest_shakespeare",     "La tempestad",                     "Shakespeare, William" ],
      [ "midsummer_shakespeare",   "Sueño de una noche de verano",     "Shakespeare, William" ],
      [ "sonnets_shakespeare",     "Sonetos",                          "Shakespeare, William" ]
    ].map do |id, title, author|
      Book.create!(id: id, title: title, author: author).tap do |b|
        index_word(b, "shakespeare", source: "author")
        index_word(b, author.split(",").first.downcase.strip, source: "author")
      end
    end

    # --- 4 books ABOUT Shakespeare (Rosen, Hugo, Lamb, Beach) ---
    # Use single-quoted strings to avoid comma-in-string collisions
    # with the array literal separators.
    about_shakespeare_books = [
      [ "rosen_william",    "William Shakespeare En su época",   "Rosen, Michael"      ],
      [ "hugo_william",     "William Shakespeare Su vida",      "Hugo, Victor"        ],
      [ "lamb_cuentos",     "Cuentos de Shakespeare",           "Lamb, Charles"       ],
      [ "beach_shakespeare", "Shakespeare and company",          "Beach, Sylvia"        ]
    ]
    about_shakespeare_books.each do |id, title, author|
      Book.create!(id: id, title: title, author: author).tap do |b|
        # These have "shakespeare" or "william shakespeare" in the
        # title only — so the LIKE-exact tier matches them too.
        index_word(b, "shakespeare", source: "title")
        index_word(b, "william",       source: "title")
        # Also link Shakespeare as an authority (so FTS5 would match
        # them too — exactly how the real criticism books matched).
        shakespeare_auth = Authority.create!(
          id: "auth_shakespeare_#{id}",
          name: "Shakespeare, William",
          authority_type: "Autor"
        )
        BookAuthority.create!(book: b, authority: shakespeare_auth)
      end
    end

    # --- 40+ NOISE books whose names contain common trigrams with
    # "shakespeare" (sha/hak/ake/kes/esp/spe/pea/ear/are) but do NOT
    # contain the literal "shakespeare" substring in title or author.
    # These are the books that, in the pre-fix code, filled the 50-cap
    # and pushed the real Shakespeare books out.
    noise_names = [
      "Duthie, Ellen", "Tavares, Gonçalo M", "Abenshushan, Vivian",
      "Calders, Pere", "Rexroth, Kenneth", "Earleson, T.",
      "Shakerton, K.", "Hakesworth, J.", "Parker, R.",
      "Earlesworth, J.", "Ares, M.", "Shakeout, L.",
      "Hak, E.", "Ear, L.", "Hakes, S.", "Spear, M.",
      "Hake, B.", "Arescu, D.", "Shakes, J.", "Earen, T.",
      "Earley, C.", "Earlow, K.", "Kesper, R.", "Areola, S.",
      "Maker, H.", "Faker, S.", "Taker, M.", "Baker, R.",
      "Quaker, S.", "Maker, E.", "Haker, K.", "Breaker, T.",
      "Quaker, A.", "Shaker, L.", "Quaker, D.", "Breaker, M.",
      "Quaker, T.", "Shaker, R.", "Ears, M.", "Earles, K.",
      "Hakes, D.", "Earleson, S.", "Hakesworth, T.", "Pearson, R."
    ]
    noise_names.each_with_index do |author, i|
      Book.create!(id: "aa_noise_#{i}", title: "Some Other Title #{i}", author: author).tap do |b|
        index_word(b, author.split(",").first.downcase.strip, source: "author")
      end
    end

    # --- 20+ other-author books to keep the catalog realistic ---
    other_author_books = [
      [ "hem_1",  "The Old Man and the Sea",            "Hemingway, Ernest"          ],
      [ "hem_2",  "A Farewell to Arms",                "Hemingway, Ernest"          ],
      [ "rul_1",  "Pedro Páramo",                      "Rulfo, Juan"                ],
      [ "rul_2",  "El llano en llamas",                "Rulfo, Juan"                ],
      [ "gar_1",  "Cien años de soledad",              "García Márquez, Gabriel"    ],
      [ "gar_2",  "El amor en los tiempos del cólera", "García Márquez, Gabriel"    ],
      [ "hug_1",  "Los miserables",                   "Hugo, Victor"               ],
      [ "cor_1",  "Don Quijote",                      "Cervantes, Miguel de"       ],
      [ "bor_1",  "Don Quijote de la Mancha",         "Borges, Jorge Luis"         ],
      [ "ner_1",  "Cien sonetos de amor",             "Neruda, Pablo"              ],
      [ "ale_1",  "La casa de los espíritus",         "Allende, Isabel"            ],
      [ "mar_1",  "Como agua para chocolate",         "Esquivel, Laura"            ],
      [ "cas_1",  "La ciudad y los perros",           "Vargas Llosa, Mario"        ],
      [ "fue_1",  "Pedro Páramo",                     "Fuentes, Carlos"            ],
      [ "maz_1",  "El túnel",                         "Sábato, Ernesto"            ],
      [ "cor_2",  "Rayuela",                          "Cortázar, Julio"            ],
      [ "bar_1",  "Conversación en La Catedral",      "Allende, Isabel"            ],
      [ "vas_1",  "La casa verde",                    "Vargas Llosa, Mario"        ],
      [ "rib_1",  "Hijo de hombre",                   "Roa Bastos, Augusto"        ],
      [ "guy_1",  "Los ríos profundos",                "Guyer, Felisberto"          ]
    ]
    other_author_books.map do |id, title, author|
      Book.create!(id: id, title: title, author: author).tap do |b|
        index_word(b, author.split(",").first.downcase.strip, source: "author")
      end
    end

    # Bulk-rebuild the FTS5 index once after all fixture data is in,
    # not on every single word insertion. This also makes sure any
    # leftover rows from a previous failed run are cleared (the
    # rebuild_from_book_words! method handles a full rebuild).
    FuzzyBookLookup.rebuild_from_book_words!
  end

  teardown do
    BookAuthority.delete_all
    BookWord.delete_all
    Authority.delete_all
    Book.delete_all
  end

  test "searching for shakespeare returns Shakespeare books, not noise" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      results = CatalogSearchService.search("shakespeare", limit: 10)
      ids     = results.map { |r| r[:biblio_id] }

      # The 7 Shakespeare works must come back.
      %w[hamlet_shakespeare macbeth_shakespeare romeo_shakespeare
         lear_shakespeare tempest_shakespeare midsummer_shakespeare
         sonnets_shakespeare].each do |expected_id|
        assert_includes ids, expected_id,
                        "expected '#{expected_id}' in the top 10 results"
      end

      # The noise books (Rexroth, Duthie, etc.) must NOT be in the top 10.
      # They share trigrams with "shakespeare" but don't actually
      # contain it — they were the books that filled the 50-cap and
      # displaced the real targets in the pre-fix code.
      assert results.none? { |r| r[:author].to_s.match?(/Rexroth|Duthie|Tavares|Abenshushan|Calders/) },
             "noise books (Rexroth, Duthie, etc.) must not appear in the top 10"
    end
  end

  test "FTS5 tier fills remaining slots after LIKE-exact matches (hemingwy typo)" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      results = CatalogSearchService.search("hemingwy", limit: 5)
      ids     = results.map { |r| r[:biblio_id] }

      assert results.size > 0, "hemingwy (1-insert typo) must return at least one result"
      assert_includes ids, "hem_1",
                      "hemingwy should reach Hemingway via FTS5 trigram overlap"
    end
  end

  test "FTS5 tier catches dropped-first-char typo (akespeare)" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      results = CatalogSearchService.search("akespeare", limit: 5)
      ids     = results.map { |r| r[:biblio_id] }

      assert results.size > 0, "akespeare (dropped first char) must return at least one result"
      assert_includes ids, "hamlet_shakespeare",
                      "akespeare should reach Shakespeare via FTS5 trigram overlap"
    end
  end
end
