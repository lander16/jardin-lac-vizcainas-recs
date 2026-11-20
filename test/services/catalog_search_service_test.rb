require "test_helper"

class CatalogSearchServiceTest < ActiveSupport::TestCase
  setup do
    @book_hesse1 = Book.create!(id: "b10", title: "Siddhartha", author: "Hermann Hesse")
    @book_hesse2 = Book.create!(id: "b11", title: "Demian", author: "Hermann Hesse")
    @book_rulfo  = Book.create!(id: "b12", title: "Pedro Páramo", author: "Juan Rulfo")
  end

  test "fuzzy search finds books by author" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      results = CatalogSearchService.search("Hesse")
      assert_not_empty results
      titles = results.map { |r| r[:title] }
      assert_includes titles, "Siddhartha"
      assert_includes titles, "Demian"
    end
  end

  test "search returns empty for blank query" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      assert_empty CatalogSearchService.search("")
    end
  end

  test "search degrades to token-only when QueryEmbedder is unavailable" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      results = CatalogSearchService.search("Hesse")
      assert_not_empty results
      # No semantic scores should be attached.
      assert results.all? { |r| r[:semantic_score].nil? }
    end
  end

  test "search returns a semantic_score when both query and book have an embedding" do
    query_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: true, vector: query_vec)) do
      matching_blob    = (Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }).pack("e*")
      orthogonal_blob  = (Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[1] = 1.0 }).pack("e*")
      @book_hesse1.update!(embedding: matching_blob,   embedding_model: "test")
      @book_hesse2.update!(embedding: orthogonal_blob, embedding_model: "test")
      @book_rulfo.update!(embedding: orthogonal_blob, embedding_model: "test")

      results = CatalogSearchService.search("Hesse")
      siddhartha = results.find { |r| r[:biblio_id] == "b10" }
      demian    = results.find { |r| r[:biblio_id] == "b11" }

      assert_not_nil siddhartha
      assert_not_nil demian
      assert_equal 1.0, siddhartha[:semantic_score]
      assert_equal 0.0, demian[:semantic_score]
      assert_operator siddhartha[:match_score], :>, demian[:match_score]
      # Explanation should mention the semantic line for the matching book.
      assert_includes siddhartha[:match_explanation], "Coincidencia semántica"
    end
  end

  test "semantic-only query returns embedding match without token overlap" do
    query_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: true, vector: query_vec)) do
      @book_hesse1.update!(embedding: query_vec.pack("e*"), embedding_model: "test")
      @book_hesse2.update!(embedding: Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[1] = 1.0 }.pack("e*"), embedding_model: "test")

      results = CatalogSearchService.search("astronomy orchids", limit: 10)
      ids = results.map { |r| r[:biblio_id] }

      assert_includes ids, "b10"
      assert_equal 1.0, results.find { |r| r[:biblio_id] == "b10" }[:semantic_score]
    end
  end

  test "QueryEmbedder encode returns nil when model load fails" do
    embedder = QueryEmbedder.new
    embedder.define_singleton_method(:available?) { true }
    embedder.define_singleton_method(:ensure_loaded!) { raise StandardError, "boom" }

    assert_nil embedder.encode("Hesse")
  end

  test "search does not fail when available embedder encode returns nil" do
    failing = Object.new
    failing.define_singleton_method(:available?) { true }
    failing.define_singleton_method(:encode) { |_t| nil }

    with_stubbed_class_method(QueryEmbedder, :default, failing) do
      results = CatalogSearchService.search("Hesse")
      assert_not_empty results
      assert results.all? { |r| r[:semantic_score].nil? }
    end
  end

  test "requested limit above default can return more than fifty exact matches" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      (1..60).each do |i|
        Book.create!(id: "exact_limit_#{i}", title: "Shared Exact Term #{i}", author: "Limit Tester")
      end

      results = CatalogSearchService.search("Shared Exact", limit: 100)

      assert_operator results.size, :>, 50
    end
  end

  test "search keeps pure token score when book has no embedding" do
    query_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: true, vector: query_vec)) do
      # Only one book has an embedding; the other is left nil.
      matching_blob = Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }.pack("e*")
      @book_hesse1.update!(embedding: matching_blob, embedding_model: "test")

      results = CatalogSearchService.search("Hesse")
      siddhartha = results.find { |r| r[:biblio_id] == "b10" }
      demian    = results.find { |r| r[:biblio_id] == "b11" }

      assert_not_nil siddhartha
      assert_not_nil demian
      assert_nil demian[:semantic_score]
    end
  end

  test "SQL pre-filter is typo-tolerant at the first-N-chars level" do
    # The user-reported regression: searching for "shakesrpeare"
    # (transposition in the middle) used to return 0 results because
    # the SQL pre-filter only matched the literal substring. The fix
    # is to also match the first 5 chars of each query token, so the
    # candidate set still contains the Shakespeare books and the
    # Ruby Levenshtein can rank them.
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      Book.create!(id: "shake_1", title: "Hamlet", author: "Shakespeare, William")

      results = CatalogSearchService.search("shakesrpeare", limit: 10)
      ids = results.map { |r| r[:biblio_id] }

      assert_includes ids, "shake_1",
                      "Shakespeare should appear via the prefix fallback " \
                      "even though the literal substring 'shakesrpeare' " \
                      "isn't in the book metadata"
    end
  end

  test "SQL pre-filter catches dropped first character via trigrams" do
    # "akespeare" (no leading 's') is matched because the trigrams
    # "kes", "esp", "spe", "pea", "ear", "are" all overlap with
    # "shakespeare" (6 of 7 trigrams).
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      Book.create!(id: "shake_1", title: "Hamlet", author: "Shakespeare, William")

      results = CatalogSearchService.search("akespeare", limit: 10)
      ids = results.map { |r| r[:biblio_id] }

      assert_includes ids, "shake_1",
                      "Shakespeare should appear via the trigram fallback " \
                      "even though the query is missing the first 's'"
    end
  end

  test "FTS5 tier catches dropped-first-char and 1-insertion typos" do
    # The previous implementation used a LIKE-trigram tier that also
    # caught pure-transposition cases like 'pedrp' -> 'pedro'. That tier
    # was removed (it was too broad and pushed out the real targets for
    # common words like 'shakespeare'); the FTS5 trigram tokenizer
    # now provides the fuzzy matching at the DB level.
    #
    # FTS5 trigrams require ALL query trigrams to be present in the
    # indexed word. This catches dropped-first-char / dropped-last-char
    # and 1-insertion typos (where the dropped/inserted char doesn't
    # introduce a new trigram) but NOT pure-transposition typos where
    # the chars are reordered (e.g. 'pedrp' -> 'pedro' needs the
    # trigrams 'ped', 'edr', 'drp' all present, but 'pedro' has
    # 'ped', 'edr', 'dro' — 'drp' is not a substring of 'pedro').
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      hemingway = Book.create!(id: "ft_hem_1", title: "The Old Man and the Sea", author: "Hemingway, Ernest")
      BookWord.create!(book_id: hemingway.id, word: "hemingway", source: "author")
      BookWord.create!(book_id: hemingway.id, word: "ernest", source: "author")
      BookWord.create!(book_id: hemingway.id, word: "old", source: "title")
      BookWord.create!(book_id: hemingway.id, word: "man", source: "title")
      BookWord.create!(book_id: hemingway.id, word: "sea", source: "title")
      FuzzyBookLookup.rebuild_from_book_words!

      # 'akespeare' is 'shakespeare' minus the leading 's'. FTS5 catches
      # it because all of its trigrams ('aks','kse','esp','spe','pea',
      # 'ear','are') are substrings of 'shakespeare'.
      shakespeare = Book.create!(id: "ft_shk_1", title: "Hamlet", author: "Shakespeare, William")
      BookWord.create!(book_id: shakespeare.id, word: "shakespeare", source: "author")
      BookWord.create!(book_id: shakespeare.id, word: "hamlet", source: "title")
      FuzzyBookLookup.rebuild_from_book_words!

      hem_ids = CatalogSearchService.search("hemingwy", limit: 10).map { |r| r[:biblio_id] }
      assert_includes hem_ids, "ft_hem_1",
                       "hemingwy (1 insert) should reach hemingway via FTS5 trigram overlap"

      shk_ids = CatalogSearchService.search("akespeare", limit: 10).map { |r| r[:biblio_id] }
      assert_includes shk_ids, "ft_shk_1",
                       "akespeare (dropped first char) should reach shakespeare via FTS5 trigram overlap"
    end
  end

  test "bounded vocabulary fallback catches pure transposition typo" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      BookWord.create!(book_id: @book_rulfo.id, word: "rulfo", source: "author")
      BookWord.create!(book_id: @book_rulfo.id, word: "juan", source: "author")
      FuzzyBookLookup.rebuild_from_book_words!

      results = CatalogSearchService.search("rulsfo", limit: 10, debug: true)
      rulfo = results.find { |r| r[:biblio_id] == @book_rulfo.id }

      assert_not_nil rulfo, "rulsfo should find Juan Rulfo via bounded transposition fallback"
      assert_includes rulfo[:candidate_sources], "bounded_transposition"
      assert rulfo[:score_components].present?, "debug results should include score components"
    end
  end

  test "normal search results do not include diagnostics" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      results = CatalogSearchService.search("Hesse")

      assert_not_empty results
      assert_not results.first.key?(:candidate_sources)
      assert_not results.first.key?(:score_components)
    end
  end

  test "authority-tier is suppressed when the query matches an author name" do
    # Searching for 'shakespeare' should return only Shakespeare's own
    # works, not a literary-criticism book that happens to list
    # Shakespeare as one of its many authority tags. The latter would
    # pollute the result set with 70-pt authority matches and hide
    # the user's intent.
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      shakespeare = Book.create!(id: "sh_hamlet", title: "Hamlet", author: "Shakespeare, William")
      rexroth     = Book.create!(id: "rx_cita",   title: "Cita con los clásicos", author: "Rexroth, Kenneth")
      # Link Shakespeare as an authority on Rexroth's book (as in the
      # real data: a literary-criticism book that lists dozens of
      # classical authors including Shakespeare).
      shakespeare_authority = Authority.create!(id: "auth_shakes", name: "Shakespeare, William", authority_type: "Autor")
      BookAuthority.create!(book: rexroth, authority: shakespeare_authority)

      results = CatalogSearchService.search("shakespeare", limit: 10)
      ids = results.map { |r| r[:biblio_id] }

      assert_includes ids, "sh_hamlet", "Shakespeare's Hamlet should be in the results"
      assert_not_includes ids, "rx_cita",
                         "Rexroth's book has 'Shakespeare' as an authority " \
                         "but should NOT appear in the results when the query " \
                         "matches an actual author name"
    end
  end

  test "FTS5 fuzzy lookup returns candidates for typo'd book words" do
    # Isolates the disk-backed FTS5 candidate source (FuzzyBookLookup)
    # from the LIKE tiers in candidate_books. Exercises the same
    # index-population path the import rake task runs, so this test
    # pins the FTS5 contract that book_words_fts must stay in sync.
    book = Book.create!(id: "fts_hem_1", title: "The Old Man and the Sea", author: "Ernest Hemingway")
    BookWord.create!(book_id: book.id, word: "hemingway", source: "author")
    BookWord.create!(book_id: book.id, word: "shakespeare", source: "author")

    FuzzyBookLookup.rebuild_from_book_words!

    # "hemingwa" is "hemingway" minus the trailing 'y' — every query
    # trigram still appears in the indexed word, so the FTS5 trigram
    # tokenizer surfaces the book directly.
    assert_includes FuzzyBookLookup.candidate_ids_for_token("hemingwa"), book.id

    # "akespeare" is "shakespeare" minus the leading 's' — the trigram
    # index catches dropped-first-character typos too.
    assert_includes FuzzyBookLookup.candidate_ids_for_token("akespeare"), book.id
  end

  test "FTS5 fuzzy lookup skips short and blank tokens" do
    assert_empty FuzzyBookLookup.candidate_ids_for_token("")
    assert_empty FuzzyBookLookup.candidate_ids_for_token(nil)
    assert_empty FuzzyBookLookup.candidate_ids_for_token("ab")
    assert_empty FuzzyBookLookup.candidate_ids_for_tokens([ nil, "x", "ab" ])
  end

  test "candidate set is ordered with LIKE-exact matches before FTS5-fuzzy matches" do
    # Regression test for the 'shakespeare' bug: candidate_books used to OR
    # the LIKE-exact tier with the FTS5 fuzzy tier and cap the combined
    # result at CANDIDATE_LIMIT (50). FTS5's noisy common-trigram matches
    # (books whose book_words contain "shakespeare" via an authority-name
    # source) filled the cap and pushed the real Shakespeare books out, so
    # the search returned 0 results. The fix queries the LIKE-exact tier
    # first and only fills the remaining slots from FTS5, so the exact
    # matches always keep their rank.
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      # Noise books that match the FTS5 tier but NOT the LIKE-exact tier.
      # The first five are the real authors from the debug session; each
      # noise book gets a book_word "shakespeare" (source: authority_name)
      # exactly like the production literary-criticism books that list
      # Shakespeare as an authority. Their title/author never contain the
      # literal substring "shakespeare", so they never match the LIKE tier.
      noise_books = [
        [ "noise_3",  "Random Title", "Duthie, Ellen" ],
        [ "noise_34", "Something",    "Tavares, Gonçalo M" ],
        [ "noise_35", "Other",        "Abenshushan, Vivian" ],
        [ "noise_51", "Another",      "Calders, Pere" ],
        [ "noise_56", "Yet Another",  "Rexroth, Kenneth" ]
      ]
      # Enough extra FTS5-only noise to overflow the 50-candidate cap.
      # The "aa_" prefix sorts these ids lexicographically BEFORE
      # "hamlet_shakespeare", and they are created BEFORE it too, so both
      # orderings SQLite can pick for the pre-fix query
      # (SELECT DISTINCT ... OR'd scopes ... LIMIT 50, no ORDER BY) — the
      # DISTINCT-column sort or the rowid scan — deterministically fill the
      # cap with noise rows and truncate the Shakespeare book out, exactly
      # like the FTS5 noise did in production.
      (1..50).each { |i| noise_books << [ "aa_noise_#{i}", "Noise Title #{i}", "Duthie, Ellen" ] }

      noise_books.each do |id, title, author|
        Book.create!(id: id, title: title, author: author)
        FuzzyText.normalize_words(author).each do |word|
          BookWord.create!(book_id: id, word: word, source: "author")
        end
        BookWord.create!(book_id: id, word: "shakespeare", source: "authority_name")
      end

      # The one LIKE-exact match: author contains the literal "shakespeare".
      # Created LAST so its rowid is the highest — the pre-fix rowid-ordered
      # scan must reach the 51st row before seeing it.
      Book.create!(id: "hamlet_shakespeare", title: "Hamlet", author: "Shakespeare, William")
      BookWord.create!(book_id: "hamlet_shakespeare", word: "shakespeare", source: "author")
      BookWord.create!(book_id: "hamlet_shakespeare", word: "hamlet", source: "title")
      BookWord.create!(book_id: "hamlet_shakespeare", word: "william", source: "author")

      FuzzyBookLookup.rebuild_from_book_words!

      results = CatalogSearchService.search("shakespeare", limit: 20)
      top3 = results.first(3).map { |r| r[:biblio_id] }

      assert_includes top3, "hamlet_shakespeare",
                      "the LIKE-exact Shakespeare book must be ranked before " \
                      "the FTS5-fuzzy noise books (the exact tier must win " \
                      "the CANDIDATE_LIMIT ordering)"
    end
  end

  test "handles stopword-heavy multi-word title queries accurately" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      Book.create!(id: "paz_1", title: "El laberinto de la soledad", author: "Octavio Paz")
      Book.create!(id: "decoy_1", title: "El arte de la guerra", author: "Sun Tzu")

      results = CatalogSearchService.search("El laberinto de la soledad")
      ids = results.map { |r| r[:biblio_id] }

      assert_includes ids, "paz_1"
      assert_not_includes ids, "decoy_1"
      assert_equal 100.0, results.find { |r| r[:biblio_id] == "paz_1" }[:match_score]
    end
  end

  test "accent-folded author queries match identically with and without diacritics" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      Book.create!(id: "ggm_1", title: "El otoño del patriarca", author: "Gabriel García Márquez")

      accented = CatalogSearchService.search("García")
      plain = CatalogSearchService.search("Garcia")

      accented_match = accented.find { |r| r[:biblio_id] == "ggm_1" }
      plain_match = plain.find { |r| r[:biblio_id] == "ggm_1" }

      assert_not_nil accented_match
      assert_not_nil plain_match
      assert_equal accented_match[:match_score], plain_match[:match_score]
      assert_includes plain_match[:match_explanation], "Coincidencia en autor"
    end
  end

  test "does not suppress authority matches for non-author query historia del arte" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      title_book = Book.create!(id: "hist_title", title: "Historia del arte", author: "E. H. Gombrich")
      auth_book = Book.create!(id: "hist_auth", title: "Conceptos fundamentales", author: "Heinrich Wölfflin")
      authority = Authority.create!(id: "auth_hist_arte", name: "Historia del arte", authority_type: "Tema")
      BookAuthority.create!(book: auth_book, authority: authority)

      [ title_book, auth_book ].each do |b|
        FuzzyText.normalize_words(b.title).each { |w| BookWord.create!(book: b, word: w, source: "title") }
        FuzzyText.normalize_words(b.author).each { |w| BookWord.create!(book: b, word: w, source: "author") }
      end
      FuzzyText.normalize_words(authority.name).each do |w|
        BookWord.create!(book: auth_book, word: w, source: "authority_name")
      end

      results = CatalogSearchService.search("historia del arte")
      auth_result = results.find { |r| r[:biblio_id] == "hist_auth" }

      assert_not_nil auth_result
      assert_includes auth_result[:match_explanation], "Coincidencia en autoridad: 'Historia del arte'"
    end
  end

  test "safely executes FTS5 operator and hyphenated queries like NOT and don-quijote" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      not_book = Book.create!(id: "fts_not", title: "To Be or Not to Be", author: "Ryan North")
      quijote_book = Book.create!(id: "fts_quijote", title: "Don Quijote de la Mancha", author: "Miguel de Cervantes")

      [ not_book, quijote_book ].each do |b|
        FuzzyText.normalize_words(b.title).each { |w| BookWord.create!(book: b, word: w, source: "title") }
      end
      FuzzyBookLookup.rebuild_from_book_words!

      assert_includes FuzzyBookLookup.candidate_ids_for_token("NOT"), not_book.id
      assert_nothing_raised { FuzzyBookLookup.candidate_ids_for_token("don-quijote") }

      not_results = CatalogSearchService.search("NOT")
      quijote_results = CatalogSearchService.search("don-quijote")

      assert_includes not_results.map { |r| r[:biblio_id] }, not_book.id
      assert_includes quijote_results.map { |r| r[:biblio_id] }, quijote_book.id
    end
  end

  test "scores and explains semantic-only candidates using cosine threshold" do
    query_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }
    half_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap do |v|
      v[0] = 0.5
      v[1] = Math.sqrt(0.75)
    end
    below_threshold_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap do |v|
      v[0] = 0.3
      v[1] = Math.sqrt(0.91)
    end

    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: true, vector: query_vec)) do
      @book_hesse1.update!(embedding: half_vec.pack("e*"), embedding_model: "test")
      @book_hesse2.update!(embedding: below_threshold_vec.pack("e*"), embedding_model: "test")

      results = CatalogSearchService.search("astronomia botánica", limit: 10)
      match = results.find { |r| r[:biblio_id] == @book_hesse1.id }

      assert_not_nil match
      assert_nil results.find { |r| r[:biblio_id] == @book_hesse2.id }
      assert_in_delta 42.5, match[:match_score], 0.1
      assert_in_delta 0.5, match[:semantic_score], 0.001
      assert_equal "Coincidencia semántica (coseno 0.5)", match[:match_explanation]
    end
  end
end
