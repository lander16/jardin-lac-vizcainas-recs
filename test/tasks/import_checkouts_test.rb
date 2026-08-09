require "test_helper"
require "rake"
require "tempfile"

class ImportCheckoutsTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks
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
