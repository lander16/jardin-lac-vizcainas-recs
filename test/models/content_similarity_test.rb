require "test_helper"

class ContentSimilarityTest < ActiveSupport::TestCase
  setup do
    @book = Book.create!(id: "cs_book_1", title: "Book Alpha")
    @similar_book = Book.create!(id: "cs_book_2", title: "Book Beta")
    @content_similarity = ContentSimilarity.new(
      book: @book,
      similar_book: @similar_book,
      similarity: 0.88
    )
  end

  test "valid content similarity" do
    assert @content_similarity.valid?
  end

  test "invalid without book_id" do
    @content_similarity.book = nil
    assert_not @content_similarity.valid?
    assert_includes @content_similarity.errors[:book_id], "can't be blank"
  end

  test "invalid without similar_book_id" do
    @content_similarity.similar_book = nil
    assert_not @content_similarity.valid?
    assert_includes @content_similarity.errors[:similar_book_id], "can't be blank"
  end

  test "invalid with duplicate similar_book_id scoped to book_id" do
    @content_similarity.save!
    duplicate = ContentSimilarity.new(
      book: @book,
      similar_book: @similar_book,
      similarity: 0.50
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:similar_book_id], "has already been taken"

    reverse = ContentSimilarity.new(
      book: @similar_book,
      similar_book: @book,
      similarity: 0.50
    )
    assert reverse.valid?
  end

  test "belongs_to book and similar_book associations" do
    @content_similarity.save!
    assert_equal @book, @content_similarity.book
    assert_equal @similar_book, @content_similarity.similar_book
  end

  test "prevents self-referential similarity" do
    self_ref = ContentSimilarity.new(book: @book, similar_book: @book, similarity: 0.9)

    assert_not self_ref.valid?
    assert_includes self_ref.errors[:similar_book_id], "cannot be the same as book_id"
  end

  test "validates similarity is within -1.0 to 1.0" do
    [ -1.0, 0.0, 1.0 ].each do |valid_sim|
      cs = ContentSimilarity.new(book: @book, similar_book: @similar_book, similarity: valid_sim)
      assert cs.valid?, "expected similarity #{valid_sim} to be valid"
    end

    [ nil, -1.01, 1.01 ].each do |invalid_sim|
      cs = ContentSimilarity.new(book: @book, similar_book: @similar_book, similarity: invalid_sim)
      assert_not cs.valid?, "expected similarity #{invalid_sim.inspect} to be invalid"
      assert_not_empty cs.errors[:similarity]
    end
  end
end
