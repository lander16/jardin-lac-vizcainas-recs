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
end
