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
end
