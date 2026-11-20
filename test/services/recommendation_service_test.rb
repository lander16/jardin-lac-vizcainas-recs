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

  test "recommend does not execute N+1 queries when building explanations for multiple candidates" do
    shared = Authority.create!(id: "a_n1", name: "Ciencia", authority_type: "subject")
    BookAuthority.create!(book: @book1, authority: shared)

    5.times do |i|
      cand = Book.create!(id: "cand_n1_#{i}", title: "Cand #{i}", author: "Author #{i}")
      ContentSimilarity.create!(book: @book1, similar_book: cand, similarity: 0.8 + (i * 0.01))
      BookAuthority.create!(book: cand, authority: shared)
      BookConnection.create!(source_book: @book1, target_book: cand, weight: 2)
    end

    queries = []
    callback = ->(_name, _start, _finish, _id, payload) {
      queries << payload[:sql] unless payload[:name] == "SCHEMA" || payload[:sql] =~ /PRAGMA|sqlite_/i
    }

    recs = nil
    ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
      recs = RecommendationService.new(@patron).recommend(w_content: 0.5, w_collab: 0.0, w_auth: 0.5, limit: 5)
    end

    assert_equal 5, recs.size
    assert_operator queries.size, :<=, 12
    recs.each do |rec|
      assert_includes rec[:explanation], "Book One"
      assert_includes rec[:explanation], "Ciencia"
    end
  end

  test "excludes zero-weight signals and normalizes remaining weights" do
    similar_patron = Patron.create!(id: "p_zero", name: "Similar Zero")
    Checkout.create!(patron: similar_patron, book: @book3)
    UserSimilarity.create!(patron: @patron, similar_patron: similar_patron, jaccard_score: 0.95)
    BookConnection.create!(source_book: @book1, target_book: @book2, weight: 4)

    recs = RecommendationService.new(@patron).recommend(w_content: 0.2, w_collab: 0.0, w_auth: 0.2)

    assert_equal [ "b2" ], recs.map { |r| r[:book_id] }
    rec = recs.first
    assert_in_delta 1.0, rec[:score], 1e-4
    assert_equal 100, rec[:match_percentage]
    assert_equal "multiple", rec[:primary_source]
    assert_equal [ "content", "authority" ], rec[:sources]
    assert_equal 0.0, rec[:raw_scores][:collaborative]
  end

  test "deduplicates repeat checkouts for both target patron and similar peers" do
    Checkout.create!(patron: @patron, book: @book1, checkout_date: 1.day.ago)
    Checkout.create!(patron: @patron, book: @book1, checkout_date: 2.days.ago)

    peer_repeat = Patron.create!(id: "p_repeat", name: "Peer Repeat")
    peer_strong = Patron.create!(id: "p_strong", name: "Peer Strong")
    book4 = Book.create!(id: "b4_dedup", title: "Book Four", author: "Author Four")

    UserSimilarity.create!(patron: @patron, similar_patron: peer_repeat, jaccard_score: 0.5)
    UserSimilarity.create!(patron: @patron, similar_patron: peer_strong, jaccard_score: 0.8)

    3.times { |i| Checkout.create!(patron: peer_repeat, book: @book3, checkout_date: i.days.ago) }
    Checkout.create!(patron: peer_strong, book: book4)

    content_recs = RecommendationService.new(@patron).recommend(w_content: 1.0, w_collab: 0.0, w_auth: 0.0)
    assert_not_includes content_recs.map { |r| r[:book_id] }, @book1.id
    assert_in_delta 0.8, content_recs.first[:raw_scores][:content], 1e-4

    collab_recs = RecommendationService.new(@patron).recommend(w_content: 0.0, w_collab: 1.0, w_auth: 0.0)
    assert_equal [ book4.id, @book3.id ], collab_recs.map { |r| r[:book_id] }
    assert_in_delta 0.8, collab_recs.first[:raw_scores][:collaborative], 1e-4
    assert_in_delta 0.5, collab_recs.second[:raw_scores][:collaborative], 1e-4
  end

  test "diversify_by_author pulls candidates beyond top N when one author dominates" do
    ContentSimilarity.delete_all

    prolific1 = Book.create!(id: "b_pro_1", title: "Prolific 1", author: "Dominating Author")
    prolific2 = Book.create!(id: "b_pro_2", title: "Prolific 2", author: "Dominating Author")
    prolific3 = Book.create!(id: "b_pro_3", title: "Prolific 3", author: "Dominating Author")
    distinct = Book.create!(id: "b_distinct", title: "Distinct", author: "Distinct Author")

    ContentSimilarity.create!(book: @book1, similar_book: prolific1, similarity: 1.00)
    ContentSimilarity.create!(book: @book1, similar_book: prolific2, similarity: 0.99)
    ContentSimilarity.create!(book: @book1, similar_book: prolific3, similarity: 0.98)
    ContentSimilarity.create!(book: @book1, similar_book: distinct, similarity: 0.97)

    recs = RecommendationService.new(@patron).recommend(w_content: 1.0, w_collab: 0.0, w_auth: 0.0, limit: 2)

    assert_equal [ prolific1.id, distinct.id ], recs.map { |r| r[:book_id] }
  end
end
