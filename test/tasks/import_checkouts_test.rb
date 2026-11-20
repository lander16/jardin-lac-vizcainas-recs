# frozen_string_literal: true

require "test_helper"
require "rake"
require "tempfile"

class ImportCheckoutsTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks unless Rake::Task.task_defined?("import:checkouts")
    @task = Rake::Task["import:checkouts"]
  end

  teardown do
    @task.reenable
  end

  test "imports repeat checkout rows for same patron and book" do
    Patron.create!(id: "p1", name: "Patron One")
    Book.create!(id: "b1", title: "Book One")

    with_checkout_csv(<<~CSV) do
      user_id,book_id,checkout_date
      p1,b1,2026-01-01
      p1,b1,2026-01-02
    CSV
      invoke_checkouts
    end

    assert_equal 2, Checkout.where(patron_id: "p1", book_id: "b1", simulated: false).count
  end

  test "imports blank checkout_date as nil and updates patrons checkouts_count accurately" do
    patron1 = Patron.create!(id: "p1", name: "Patron One")
    patron2 = Patron.create!(id: "p2", name: "Patron Two")
    book1 = Book.create!(id: "b1", title: "Book One")
    book2 = Book.create!(id: "b2", title: "Book Two")
    Checkout.create!(patron: patron1, book: book2, simulated: true)
    Checkout.create!(patron: patron2, book: book1, simulated: false)

    with_checkout_csv(<<~CSV) do
      user_id,book_id,checkout_date
      p1,b1,
      p1,b2,2026-01-05
    CSV
      invoke_checkouts
    end

    blank_date_checkout = Checkout.find_by!(patron_id: "p1", book_id: "b1", simulated: false)
    dated_checkout = Checkout.find_by!(patron_id: "p1", book_id: "b2", simulated: false)

    assert_nil blank_date_checkout.checkout_date
    assert_not_nil dated_checkout.checkout_date
    assert_equal 3, patron1.reload.checkouts_count
    assert_equal 0, patron2.reload.checkouts_count
  end

  test "filters invalid rows and reloads historical checkouts idempotently while preserving simulated rows" do
    Patron.create!(id: "p1", name: "Patron One")
    Book.create!(id: "b1", title: "Book One")
    Book.create!(id: "b2", title: "Book Two")
    Checkout.create!(patron_id: "p1", book_id: "b2", simulated: true)
    Checkout.create!(patron_id: "p1", book_id: "b2", simulated: false)

    with_checkout_csv(<<~CSV) do
      user_id,book_id,checkout_date
      p1,b1,2026-01-01
      missing,b1,2026-01-02
      p1,missing,2026-01-03
    CSV
      invoke_checkouts
      invoke_checkouts
    end

    assert_equal 2, Checkout.count
    assert_equal 1, Checkout.where(patron_id: "p1", book_id: "b1", simulated: false).count
    assert_equal 1, Checkout.where(patron_id: "p1", book_id: "b2", simulated: true).count
    assert_equal 0, Checkout.where(patron_id: "missing").count
    assert_equal 0, Checkout.where(book_id: "missing").count
  end

  private

  def invoke_checkouts
    @task.reenable
    @task.invoke
  end

  def with_checkout_csv(contents)
    Tempfile.create([ "koha_checkouts", ".csv" ]) do |file|
      file.write(contents)
      file.flush
      previous_path = ENV["CHECKOUTS_CSV_PATH"]
      ENV["CHECKOUTS_CSV_PATH"] = file.path
      yield
    ensure
      ENV["CHECKOUTS_CSV_PATH"] = previous_path
    end
  end
end
