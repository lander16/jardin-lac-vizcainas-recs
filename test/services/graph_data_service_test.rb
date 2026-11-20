# frozen_string_literal: true

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

  test "user_graph does not trigger N+1 queries and includes patron_id and book_id fields" do
    queries = []
    callback = ->(_name, _start, _finish, _id, payload) {
      queries << payload[:sql] unless payload[:name] == "SCHEMA" || payload[:sql] =~ /PRAGMA|sqlite_/i
    }

    result = nil
    ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
      result = GraphDataService.user_graph(@patron)
    end

    assert_operator queries.size, :<=, 6

    target_user = result[:nodes].find { |n| n[:type] == "target_user" }
    target_book = result[:nodes].find { |n| n[:type] == "target_book" }
    similar_users = result[:nodes].select { |n| n[:type] == "similar_user" }
    collab_books = result[:nodes].select { |n| n[:type] == "collab_book" }

    assert_equal @patron.id, target_user[:patron_id]
    assert_equal @book.id, target_book[:book_id]
    assert_equal 5, similar_users.size
    assert similar_users.all? { |n| n[:patron_id].present? }
    assert_equal 5, collab_books.size
    assert collab_books.all? { |n| n[:book_id].present? }
  end

  test "catalog_graph merges incoming and outgoing weights, includes book_id, and skips orphan connections" do
    shared_auth = Authority.create!(id: "g_auth_1", name: "Historia", authority_type: "Tema")
    BookAuthority.create!(book: @book, authority: shared_auth)

    mutual = Book.create!(id: "g_book_mutual", title: "Mutual Neighbor", author: "Author M")
    outgoing_only = Book.create!(id: "g_book_out", title: "Outgoing Neighbor", author: "Author O")
    incoming_only = Book.create!(id: "g_book_in", title: "Incoming Neighbor", author: "Author I")
    orphan = Book.create!(id: "g_book_orphan", title: "Orphan Neighbor", author: "Author X")

    [ mutual, outgoing_only, incoming_only ].each do |neighbor|
      BookAuthority.create!(book: neighbor, authority: shared_auth)
    end

    BookConnection.create!(source_book: @book, target_book: mutual, weight: 2)
    BookConnection.create!(source_book: mutual, target_book: @book, weight: 8)
    BookConnection.create!(source_book: @book, target_book: outgoing_only, weight: 5)
    BookConnection.create!(source_book: incoming_only, target_book: @book, weight: 4)
    BookConnection.create!(source_book: @book, target_book: orphan, weight: 99)

    limited = GraphDataService.catalog_graph(@book, limit: 3)
    connected_books = limited[:nodes].select { |n| n[:type] == "connected_book" }
    target_node = limited[:nodes].find { |n| n[:type] == "target_book" }

    assert_equal @book.id, target_node[:book_id]
    assert_equal [ mutual.id, outgoing_only.id ], connected_books.map { |n| n[:book_id] }
    assert_not_includes connected_books.map { |n| n[:book_id] }, orphan.id

    full = GraphDataService.catalog_graph(@book, limit: 15)
    full_book_ids = full[:nodes].select { |n| n[:type] == "connected_book" }.map { |n| n[:book_id] }
    assert_equal [ mutual.id, outgoing_only.id, incoming_only.id ], full_book_ids
  end
end
