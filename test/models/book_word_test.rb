require "test_helper"

class BookWordTest < ActiveSupport::TestCase
  setup do
    @book = Book.create!(id: "bw_book_1", title: "Vocabulario de la lengua mexicana")
    @book_word = BookWord.new(book: @book, word: "náhuatl", source: "title")
  end

  test "valid book word" do
    assert @book_word.valid?
  end

  test "invalid without book_id" do
    @book_word.book = nil
    assert_not @book_word.valid?
    assert_includes @book_word.errors[:book_id], "can't be blank"
  end

  test "invalid without word" do
    @book_word.word = nil
    assert_not @book_word.valid?
    assert_includes @book_word.errors[:word], "can't be blank"
  end

  test "invalid without source" do
    @book_word.source = nil
    assert_not @book_word.valid?
    assert_includes @book_word.errors[:source], "can't be blank"
  end

  test "belongs_to book association" do
    @book_word.save!
    assert_equal @book, @book_word.book
  end

  test "validates source inclusion in allowed sources" do
    BookWord::SOURCES.each do |allowed_source|
      bw = BookWord.new(book: @book, word: "palabra", source: allowed_source)
      assert bw.valid?, "expected source #{allowed_source} to be valid"
    end

    invalid = BookWord.new(book: @book, word: "palabra", source: "description")
    assert_not invalid.valid?
    assert_includes invalid.errors[:source], "is not included in the list"
  end

  test "validates word uniqueness scoped to book_id and source" do
    @book_word.save!

    same_source = BookWord.new(book: @book, word: "náhuatl", source: "title")
    assert_not same_source.valid?
    assert_includes same_source.errors[:word], "has already been taken"

    different_source = BookWord.new(book: @book, word: "náhuatl", source: "author")
    assert different_source.valid?
  end
end
