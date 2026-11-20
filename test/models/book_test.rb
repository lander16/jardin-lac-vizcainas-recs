# frozen_string_literal: true

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

  test "syncs normalized_title and normalized_author on create and update" do
    book = Book.create!(id: "book_norm", title: "¡Cien años de soledad!", author: "García Márquez, Gabriel")

    assert_equal "cien anos de soledad", book.normalized_title
    assert_equal "garcia marquez gabriel", book.normalized_author

    book.update!(title: "El otoño del patriarca", author: nil)

    assert_equal "el otono del patriarca", book.normalized_title
    assert_equal "", book.normalized_author
  end

  test "destroying book removes dependent checkouts, authorities, words, connections, and similarities" do
    book = Book.create!(id: "book_cascade", title: "Libro Principal", author: "Autora")
    other = Book.create!(id: "book_other", title: "Otro Libro", author: "Otro")
    patron = Patron.create!(id: "patron_cascade", name: "Lectora")
    authority = Authority.create!(id: "auth_cascade", name: "Historia", authority_type: "Tema")

    Checkout.create!(patron: patron, book: book)
    BookAuthority.create!(book: book, authority: authority)
    BookWord.create!(book: book, word: "principal", source: "title")
    BookConnection.create!(source_book: book, target_book: other, weight: 2)
    BookConnection.create!(source_book: other, target_book: book, weight: 3)
    ContentSimilarity.create!(book: book, similar_book: other, similarity: 0.8)
    ContentSimilarity.create!(book: other, similar_book: book, similarity: 0.7)

    assert_nothing_raised { book.destroy! }

    assert_equal 0, Checkout.where(book_id: book.id).count
    assert_equal 0, BookAuthority.where(book_id: book.id).count
    assert_equal 0, BookWord.where(book_id: book.id).count
    assert_equal 0, BookConnection.where(source_book_id: book.id).or(BookConnection.where(target_book_id: book.id)).count
    assert_equal 0, ContentSimilarity.where(book_id: book.id).or(ContentSimilarity.where(similar_book_id: book.id)).count
    assert Book.exists?(other.id)
    assert Patron.exists?(patron.id)
    assert_equal 0, authority.reload.books_count
  end
end
