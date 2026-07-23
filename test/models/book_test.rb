require "test_helper"

class BookTest < ActiveSupport::TestCase
  test "valid book" do
    book = Book.new(id: "book999", title: "Cien años de soledad", author: "Gabriel García Márquez")
    assert book.valid?
  end

  test "invalid without id or title" do
    book = Book.new
    assert_not book.valid?
    assert_includes book.errors[:id], "can't be blank"
    assert_includes book.errors[:title], "can't be blank"
  end
end
