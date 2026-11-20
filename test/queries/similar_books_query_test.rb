# frozen_string_literal: true

require "test_helper"

class SimilarBooksQueryTest < ActiveSupport::TestCase
  setup do
    @book = Book.create!(id: "book_query_1", title: "Cien años de soledad", author: "Gabriel García Márquez")
  end

  test "returns vector-based similar books when ContentSimilarity exists" do
    similar1 = Book.create!(id: "book_query_2", title: "El amor en los tiempos del cólera", author: "Gabriel García Márquez")
    similar2 = Book.create!(id: "book_query_3", title: "Crónica de una muerte anunciada", author: "Gabriel García Márquez")

    ContentSimilarity.create!(book: @book, similar_book: similar1, similarity: 0.85)
    ContentSimilarity.create!(book: similar2, similar_book: @book, similarity: 0.90)

    results = SimilarBooksQuery.call(@book)

    assert_equal 2, results.size

    first = results.first
    assert_equal similar2, first[:book]
    assert_in_delta 0.90, first[:similarity]
    assert_equal 90, first[:percentage]
    assert_equal "Vectores (Embeddings Semánticos)", first[:source_label]

    second = results.second
    assert_equal similar1, second[:book]
    assert_in_delta 0.85, second[:similarity]
    assert_equal 85, second[:percentage]
    assert_equal "Vectores (Embeddings Semánticos)", second[:source_label]
  end

  test "respects custom limit with vector similarities" do
    3.times do |i|
      b = Book.create!(id: "book_limit_#{i}", title: "Book #{i}")
      ContentSimilarity.create!(book: @book, similar_book: b, similarity: 0.5 + (i * 0.1))
    end

    results = SimilarBooksQuery.call(@book, limit: 2)
    assert_equal 2, results.size
  end

  test "falls back to shared authorities when ContentSimilarity does not exist" do
    similar = Book.create!(id: "book_query_4", title: "La hojarasca", author: "Gabriel García Márquez")
    other = Book.create!(id: "book_query_5", title: "Rayuela", author: "Julio Cortázar")

    auth1 = Authority.create!(id: "auth_q_1", name: "Realismo mágico", authority_type: "Tema")
    auth2 = Authority.create!(id: "auth_q_2", name: "Colombia", authority_type: "Lugar")

    BookAuthority.create!(book: @book, authority: auth1)
    BookAuthority.create!(book: @book, authority: auth2)

    BookAuthority.create!(book: similar, authority: auth1)
    BookAuthority.create!(book: similar, authority: auth2)

    BookAuthority.create!(book: other, authority: auth1)

    results = SimilarBooksQuery.call(@book)

    assert_equal 2, results.size

    first = results.first
    assert_equal similar, first[:book]
    assert_in_delta 1.0, first[:similarity]
    assert_equal 98, first[:percentage]
    assert_equal "2 autoridades compartidas", first[:source_label]

    expected_idf = (1.0 / Math.log2(5)) / ((1.0 / Math.log2(5)) + (1.0 / Math.log2(4)))

    second = results.second
    assert_equal other, second[:book]
    assert_in_delta expected_idf, second[:similarity], 1e-4
    assert_equal 68, second[:percentage]
    assert_equal "1 autoridad compartida", second[:source_label]
  end

  test "deduplicates mutual ContentSimilarity pairs keeping highest similarity" do
    similar_a = Book.create!(id: "book_mutual_a", title: "Alpha")
    similar_b = Book.create!(id: "book_mutual_b", title: "Beta")

    ContentSimilarity.create!(book: @book, similar_book: similar_a, similarity: 0.62)
    ContentSimilarity.create!(book: similar_a, similar_book: @book, similarity: 0.91)
    ContentSimilarity.create!(book: @book, similar_book: similar_b, similarity: 0.75)

    results = SimilarBooksQuery.call(@book)

    assert_equal [ similar_a, similar_b ], results.map { |r| r[:book] }
    assert_in_delta 0.91, results.first[:similarity]
    assert_equal 91, results.first[:percentage]
  end

  test "rarer shared authorities outrank common ones in IDF fallback" do
    rare_book = Book.create!(id: "book_rare", title: "Rare Match")
    common_book = Book.create!(id: "book_common", title: "Common Match")

    rare_auth = Authority.create!(id: "auth_rare", name: "Manuscrito único", authority_type: "Tema")
    common_auth = Authority.create!(id: "auth_common", name: "Literatura", authority_type: "Tema")

    BookAuthority.create!(book: @book, authority: rare_auth)
    BookAuthority.create!(book: @book, authority: common_auth)
    BookAuthority.create!(book: rare_book, authority: rare_auth)
    BookAuthority.create!(book: common_book, authority: common_auth)

    3.times do |i|
      filler = Book.create!(id: "book_filler_#{i}", title: "Filler #{i}")
      BookAuthority.create!(book: filler, authority: common_auth)
    end

    results = SimilarBooksQuery.call(@book)
    common_result = results.find { |r| r[:book] == common_book }

    assert_equal rare_book, results.first[:book]
    assert_not_nil common_result
    assert_operator results.first[:similarity], :>, common_result[:similarity]
  end

  test "returns empty array when neither ContentSimilarity nor shared authorities exist" do
    results = SimilarBooksQuery.call(@book)
    assert_equal [], results
  end

  test "returns empty array when book is nil" do
    assert_equal [], SimilarBooksQuery.call(nil)
  end
end
