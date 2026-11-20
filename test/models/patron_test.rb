# frozen_string_literal: true

require "test_helper"

class PatronTest < ActiveSupport::TestCase
  test "valid patron" do
    patron = Patron.new(id: "test1234", name: "María Elena", email: "elena@test.com", cardnumber: "1234567890")
    assert patron.valid?
  end

  test "invalid without id or name" do
    patron = Patron.new
    assert_not patron.valid?
    assert_includes patron.errors[:id], "can't be blank"
    assert_includes patron.errors[:name], "can't be blank"
  end

  test "syncs normalized_name on create and update" do
    patron = Patron.create!(id: "patron_norm", name: "José María Álvarez")

    assert_equal "jose maria alvarez", patron.normalized_name

    patron.update!(name: "Inés de la Cruz")

    assert_equal "ines de la cruz", patron.normalized_name
  end

  test "destroying patron removes dependent checkouts and user_similarities" do
    patron = Patron.create!(id: "patron_del", name: "Lector Uno")
    peer = Patron.create!(id: "patron_peer", name: "Lector Dos")
    book = Book.create!(id: "book_patron_del", title: "Rayuela")

    Checkout.create!(patron: patron, book: book)
    UserSimilarity.create!(patron: patron, similar_patron: peer, jaccard_score: 0.6)
    UserSimilarity.create!(patron: peer, similar_patron: patron, jaccard_score: 0.6)

    assert_nothing_raised { patron.destroy! }

    assert_equal 0, Checkout.where(patron_id: patron.id).count
    assert_equal 0, UserSimilarity.where(patron_id: patron.id).or(UserSimilarity.where(similar_patron_id: patron.id)).count
    assert Patron.exists?(peer.id)
    assert Book.exists?(book.id)
  end
end
