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

  test "prevents self-loop connections" do
    self_loop = BookConnection.new(source_book: @source_book, target_book: @source_book, weight: 2)

    assert_not self_loop.valid?
    assert_includes self_loop.errors[:target_book_id], "cannot be the same as source_book_id"
  end

  test "validates weight is a positive integer" do
    [ nil, 0, -2, 1.5 ].each do |invalid_weight|
      conn = BookConnection.new(source_book: @source_book, target_book: @target_book, weight: invalid_weight)
      assert_not conn.valid?, "expected weight #{invalid_weight.inspect} to be invalid"
      assert_not_empty conn.errors[:weight]
    end

    @book_connection.weight = 1
    assert @book_connection.valid?
  end

  test "counts_for sums outgoing and incoming connections" do
    third_book = Book.create!(id: "bc_book_3", title: "Third Book")
    BookConnection.create!(source_book: @source_book, target_book: @target_book, weight: 2)
    BookConnection.create!(source_book: third_book, target_book: @source_book, weight: 4)

    counts = BookConnection.counts_for([ @source_book.id, @target_book.id ])

    assert_equal 2, counts[@source_book.id]
    assert_equal 1, counts[@target_book.id]
    assert_equal({}, BookConnection.counts_for([]))
  end
end
