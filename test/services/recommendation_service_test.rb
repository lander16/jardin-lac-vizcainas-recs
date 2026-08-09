require "test_helper"

class RecommendationServiceTest < ActiveSupport::TestCase
  setup do
    @patron = Patron.create!(id: "p1", name: "Patron One", email: "p1@test.com", cardnumber: "111")
    @book1 = Book.create!(id: "b1", title: "Book One", author: "Author One")
    @book2 = Book.create!(id: "b2", title: "Book Two", author: "Author Two")
    @book3 = Book.create!(id: "b3", title: "Book Three", author: "Author Three")

    Checkout.create!(patron: @patron, book: @book1)
    ContentSimilarity.create!(book: @book1, similar_book: @book2, similarity: 0.8)
  end

  test "returns content-based recommendations" do
    recs = RecommendationService.new(@patron).recommend(w_content: 1.0, w_collab: 0.0, w_auth: 0.0)
    assert_not_empty recs
    assert_equal "b2", recs.first[:book_id]
  end

  test "returns empty when patron has no checkouts" do
    empty_patron = Patron.create!(id: "p2", name: "Empty", email: "empty@test.com", cardnumber: "222")
    recs = RecommendationService.new(empty_patron).recommend
    assert_empty recs
  end

  test "normalizes malformed direct weights" do
    similar_patron = Patron.create!(id: "p3", name: "Similar", email: "similar@test.com", cardnumber: "333")
    Checkout.create!(patron: similar_patron, book: @book3)
    UserSimilarity.create!(patron: @patron, similar_patron: similar_patron, jaccard_score: 0.9)

    recs = RecommendationService.new(@patron).recommend(w_content: "bad", w_collab: 2, w_auth: -1)

    assert_equal "b3", recs.first[:book_id]
  end

  test "authority explanation names actual shared authorities only" do
    shared = Authority.create!(id: "a_shared", name: "Historia de México", authority_type: "subject")
    other_read = Authority.create!(id: "a_read", name: "Lecturas antiguas", authority_type: "subject")
    candidate_only = Authority.create!(id: "a_candidate", name: "No compartida", authority_type: "subject")
    BookAuthority.create!(book: @book1, authority: shared)
    BookAuthority.create!(book: @book1, authority: other_read)
    BookAuthority.create!(book: @book2, authority: shared)
    BookAuthority.create!(book: @book2, authority: candidate_only)
    BookConnection.create!(source_book: @book1, target_book: @book2, weight: 3)

    rec = RecommendationService.new(@patron).recommend(w_content: 0, w_collab: 0, w_auth: 1).first

    assert_includes rec[:explanation], "Historia de México"
    assert_not_includes rec[:explanation], "No compartida"
    assert_not_includes rec[:explanation], "Comparte 2"
  end

  test "content explanation names closest previously read book" do
    rec = RecommendationService.new(@patron).recommend(w_content: 1, w_collab: 0, w_auth: 0).first

    assert_includes rec[:explanation], "Book One"
  end

  test "diversifies similarly scored recommendations by author" do
    book4 = Book.create!(id: "b4", title: "Book Four", author: "Author Three")
    book5 = Book.create!(id: "b5", title: "Book Five", author: "Author Five")
    ContentSimilarity.create!(book: @book1, similar_book: @book3, similarity: 0.99)
    ContentSimilarity.create!(book: @book1, similar_book: book4, similarity: 0.98)
    ContentSimilarity.create!(book: @book1, similar_book: book5, similarity: 0.97)

    recs = RecommendationService.new(@patron).recommend(w_content: 1, w_collab: 0, w_auth: 0, limit: 3)

    assert_equal [ "Author Three", "Author Five", "Author Three" ], recs.map { |rec| rec[:author] }
  end
end
