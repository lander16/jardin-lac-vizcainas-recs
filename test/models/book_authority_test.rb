require "test_helper"

class BookAuthorityTest < ActiveSupport::TestCase
  setup do
    @book = Book.create!(id: "ba_book_1", title: "Cien años de soledad")
    @authority = Authority.create!(id: "ba_auth_1", name: "Gabriel García Márquez", authority_type: "author")
    @book_authority = BookAuthority.new(book: @book, authority: @authority)
  end

  test "valid book authority" do
    assert @book_authority.valid?
  end

  test "invalid without book_id" do
    @book_authority.book = nil
    assert_not @book_authority.valid?
    assert_includes @book_authority.errors[:book_id], "can't be blank"
  end

  test "invalid without authority_id" do
    @book_authority.authority = nil
    assert_not @book_authority.valid?
    assert_includes @book_authority.errors[:authority_id], "can't be blank"
  end

  test "invalid with duplicate authority_id scoped to book_id" do
    @book_authority.save!
    duplicate = BookAuthority.new(book: @book, authority: @authority)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:authority_id], "has already been taken"

    other_book = Book.create!(id: "ba_book_2", title: "El otoño del patriarca")
    other_ba = BookAuthority.new(book: other_book, authority: @authority)
    assert other_ba.valid?
  end

  test "belongs_to book and authority associations" do
    @book_authority.save!
    assert_equal @book, @book_authority.book
    assert_equal @authority, @book_authority.authority
  end

  test "updates counter cache books_count on authority when created and destroyed" do
    assert_equal 0, @authority.reload.books_count

    assert_difference -> { @authority.reload.books_count }, 1 do
      @book_authority.save!
    end

    assert_difference -> { @authority.reload.books_count }, -1 do
      @book_authority.destroy
    end

    assert_equal 0, @authority.reload.books_count
  end
end
