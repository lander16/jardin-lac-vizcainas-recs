require "test_helper"

class AuthorityTest < ActiveSupport::TestCase
  setup do
    @authority = Authority.new(
      id: "auth_01",
      name: "Gabriel García Márquez",
      authority_type: "author"
    )
  end

  test "valid authority" do
    assert @authority.valid?
  end

  test "invalid without id" do
    @authority.id = nil
    assert_not @authority.valid?
    assert_includes @authority.errors[:id], "can't be blank"
  end

  test "invalid with duplicate id" do
    @authority.save!
    duplicate = Authority.new(
      id: "auth_01",
      name: "Another Name",
      authority_type: "topic"
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:id], "has already been taken"
  end

  test "invalid without name" do
    @authority.name = nil
    assert_not @authority.valid?
    assert_includes @authority.errors[:name], "can't be blank"
  end

  test "invalid without authority_type" do
    @authority.authority_type = nil
    assert_not @authority.valid?
    assert_includes @authority.errors[:authority_type], "can't be blank"
  end

  test "scope by_type filters records by authority_type" do
    auth1 = Authority.create!(id: "auth_t1", name: "Author 1", authority_type: "author")
    auth2 = Authority.create!(id: "auth_t2", name: "Topic 1", authority_type: "topic")

    assert_includes Authority.by_type("author"), auth1
    assert_not_includes Authority.by_type("author"), auth2

    assert_includes Authority.by_type("topic"), auth2
    assert_not_includes Authority.by_type("topic"), auth1
  end

  test "scope by_type returns all records when type is nil or blank" do
    auth1 = Authority.create!(id: "auth_t3", name: "Author 1", authority_type: "author")
    auth2 = Authority.create!(id: "auth_t4", name: "Topic 1", authority_type: "topic")

    assert_includes Authority.by_type(nil), auth1
    assert_includes Authority.by_type(nil), auth2
    assert_includes Authority.by_type(""), auth1
    assert_includes Authority.by_type(""), auth2
  end

  test "has_many book_authorities and books through book_authorities" do
    @authority.save!
    book = Book.create!(id: "book_auth_1", title: "Test Book")
    book_authority = BookAuthority.create!(book: book, authority: @authority)

    assert_includes @authority.book_authorities, book_authority
    assert_includes @authority.books, book
  end

  test "destroying authority destroys associated book_authorities" do
    @authority.save!
    book = Book.create!(id: "book_auth_2", title: "Test Book 2")
    book_authority = BookAuthority.create!(book: book, authority: @authority)

    assert_difference "BookAuthority.count", -1 do
      @authority.destroy
    end
    assert_not BookAuthority.exists?(book_authority.id)
    assert Book.exists?(book.id)
  end
end
