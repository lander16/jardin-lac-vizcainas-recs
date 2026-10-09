require "test_helper"

class BookConnectionTest < ActiveSupport::TestCase
  setup do
    @source_book = Book.create!(id: "bc_book_1", title: "Source Book")
    @target_book = Book.create!(id: "bc_book_2", title: "Target Book")
    @book_connection = BookConnection.new(
      source_book: @source_book,
      target_book: @target_book,
      weight: 5
    )
  end

  test "valid book connection" do
    assert @book_connection.valid?
  end

  test "invalid without source_book_id" do
    @book_connection.source_book = nil
    assert_not @book_connection.valid?
    assert_includes @book_connection.errors[:source_book_id], "can't be blank"
  end

  test "invalid without target_book_id" do
    @book_connection.target_book = nil
    assert_not @book_connection.valid?
    assert_includes @book_connection.errors[:target_book_id], "can't be blank"
  end

  test "invalid with duplicate target_book_id scoped to source_book_id" do
    @book_connection.save!
    duplicate = BookConnection.new(
      source_book: @source_book,
      target_book: @target_book,
      weight: 3
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:target_book_id], "has already been taken"

    reverse = BookConnection.new(
      source_book: @target_book,
      target_book: @source_book,
      weight: 3
    )
    assert reverse.valid?
  end

  test "belongs_to source_book and target_book associations" do
    @book_connection.save!
    assert_equal @source_book, @book_connection.source_book
    assert_equal @target_book, @book_connection.target_book
  end
end
