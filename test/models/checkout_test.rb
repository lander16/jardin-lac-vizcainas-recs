require "test_helper"

class CheckoutTest < ActiveSupport::TestCase
  setup do
    @patron = Patron.create!(id: "co_patron_1", name: "Sor Juana Inés")
    @book = Book.create!(id: "co_book_1", title: "Inundación Castálida")
    @checkout = Checkout.new(patron: @patron, book: @book, checkout_date: Time.current)
  end

  test "valid checkout" do
    assert @checkout.valid?
  end

  test "invalid without patron_id" do
    @checkout.patron = nil
    assert_not @checkout.valid?
    assert_includes @checkout.errors[:patron_id], "can't be blank"
  end

  test "invalid without book_id" do
    @checkout.book = nil
    assert_not @checkout.valid?
    assert_includes @checkout.errors[:book_id], "can't be blank"
  end

  test "belongs_to patron and book associations" do
    @checkout.save!
    assert_equal @patron, @checkout.patron
    assert_equal @book, @checkout.book
  end

  test "updates counter cache checkouts_count on patron when created and destroyed" do
    assert_equal 0, @patron.reload.checkouts_count

    assert_difference -> { @patron.reload.checkouts_count }, 1 do
      @checkout.save!
    end

    assert_difference -> { @patron.reload.checkouts_count }, -1 do
      @checkout.destroy
    end

    assert_equal 0, @patron.reload.checkouts_count
  end
end
