require "test_helper"

class CatalogSearchServiceTest < ActiveSupport::TestCase
  setup do
    @book_hesse1 = Book.create!(id: "b10", title: "Siddhartha", author: "Hermann Hesse")
    @book_hesse2 = Book.create!(id: "b11", title: "Demian", author: "Hermann Hesse")
    @book_rulfo  = Book.create!(id: "b12", title: "Pedro Páramo", author: "Juan Rulfo")
  end

  # Build a fake embedder that responds to .available? and .encode.
  def fake_embedder(available:, vector: nil)
    fake = Object.new
    fake.instance_variable_set(:@available, available)
    fake.instance_variable_set(:@vector, vector)
    fake.define_singleton_method(:available?) { @available }
    fake.define_singleton_method(:encode) { |_t| @vector }
    fake
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
end
