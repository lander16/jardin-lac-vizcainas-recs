require "test_helper"

class GraphDataServiceTest < ActiveSupport::TestCase
  setup do
    @patron = Patron.create!(id: "g_patron_1", name: "Patron 1", email: "p1@test.com", cardnumber: "p1")
    @book = Book.create!(id: "g_book_1", title: "Target Book", author: "Author")
    Checkout.create!(patron: @patron, book: @book)

    5.times do |i|
      sp = Patron.create!(id: "g_sp_#{i}", name: "Similar #{i}", email: "sp#{i}@test.com", cardnumber: "sp#{i}")
      UserSimilarity.create!(patron: @patron, similar_patron: sp, jaccard_score: 0.8)
      cb = Book.create!(id: "g_cb_#{i}", title: "Collab Book #{i}", author: "Author")
      Checkout.create!(patron: sp, book: cb)
    end
  end

  test "user_graph does not trigger N+1 queries when loading collaborative books" do
    queries = []
    callback = ->(_name, _start, _finish, _id, payload) {
      queries << payload[:sql] unless payload[:name] == "SCHEMA" || payload[:sql] =~ /PRAGMA|sqlite_/i
    }

    result = nil
    ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
      result = GraphDataService.user_graph(@patron)
    end

    # Preloaded queries:
    # 1. Target patron books (1)
    # 2. User similarities query for similar patron IDs (1)
    # 3. Similar patrons batch load (1)
    # 4. Checkouts batch preload (1)
    # 5. Books batch preload (1)
    # 6. User similarities relation evaluation (1)
    assert_operator queries.size, :<=, 6
    collab_nodes = result[:nodes].select { |n| n[:type] == "collab_book" }
    assert_equal 5, collab_nodes.size
  end
end
