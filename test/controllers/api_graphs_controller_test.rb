require "test_helper"

class ApiGraphsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @patron = Patron.create!(id: "api_patron_1", name: "Adriana Cortés", email: "adriana-api@test.com", cardnumber: "api-123")
    @similar_patron = Patron.create!(id: "api_patron_2", name: "Luis Gómez", email: "luis-api@test.com", cardnumber: "api-456")
    @book = Book.create!(id: "api_book_1", title: "Cien Años de Soledad", author: "García Márquez")
    @connected_book = Book.create!(id: "api_book_2", title: "El otoño del patriarca", author: "García Márquez")
    @authority = Authority.create!(id: "api_auth_1", name: "Colombia", authority_type: "Lugar", books_count: 2)

    Checkout.create!(patron: @patron, book: @book)
    Checkout.create!(patron: @similar_patron, book: @connected_book)
    UserSimilarity.create!(patron: @patron, similar_patron: @similar_patron, jaccard_score: 0.5)
    BookAuthority.create!(book: @book, authority: @authority)
    BookAuthority.create!(book: @connected_book, authority: @authority)
    BookConnection.create!(source_book: @book, target_book: @connected_book, weight: 1)
  end

  test "returns successful user graph json" do
    get api_user_graph_url(@patron.id), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_kind_of Array, body["nodes"]
    assert_kind_of Array, body["links"]

    target_user = body["nodes"].find { |node| node["type"] == "target_user" }
    target_book = body["nodes"].find { |node| node["type"] == "target_book" }
    similar_user = body["nodes"].find { |node| node["type"] == "similar_user" }
    collab_book = body["nodes"].find { |node| node["type"] == "collab_book" }

    assert_not_nil target_user
    assert_equal @patron.id, target_user["id"]
    assert_equal @patron.id, target_user["patron_id"]

    assert_not_nil target_book
    assert_equal @book.id, target_book["book_id"]

    assert_not_nil similar_user
    assert_equal @similar_patron.id, similar_user["patron_id"]

    assert_not_nil collab_book
    assert_equal @connected_book.id, collab_book["book_id"]
  end

  test "returns successful catalog graph json" do
    get api_catalog_graph_url(@book.id), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_kind_of Array, body["nodes"]
    assert_kind_of Array, body["links"]

    target_book = body["nodes"].find { |node| node["type"] == "target_book" }
    connected_book = body["nodes"].find { |node| node["type"] == "connected_book" }

    assert_not_nil target_book
    assert_equal @book.id, target_book["id"]
    assert_equal @book.id, target_book["book_id"]

    assert_not_nil connected_book
    assert_equal @connected_book.id, connected_book["book_id"]
  end

  test "returns json 404 for missing user" do
    get api_user_graph_url("missing-user"), as: :json

    assert_response :not_found
    assert_equal "Lector no encontrado", JSON.parse(response.body)["error"]
  end

  test "returns json 404 for missing book" do
    get api_catalog_graph_url("missing-book"), as: :json

    assert_response :not_found
    assert_equal "Libro no encontrado", JSON.parse(response.body)["error"]
  end

  test "user graph defaults safely when limit param is invalid" do
    extra_patron = Patron.create!(id: "api_patron_3", name: "Sofía León", email: "sofia-api@test.com", cardnumber: "api-789")
    extra_book = Book.create!(id: "api_book_3", title: "Pedro Páramo", author: "Juan Rulfo")
    Checkout.create!(patron: extra_patron, book: extra_book)
    UserSimilarity.create!(patron: @patron, similar_patron: extra_patron, jaccard_score: 0.4)

    get api_user_graph_url(@patron.id), params: { limit: "abc" }, as: :json

    assert_response :ok
    body = JSON.parse(response.body)
    similar_users = body["nodes"].select { |node| node["type"] == "similar_user" }
    assert_equal 2, similar_users.size
  end

  test "catalog graph defaults safely when limit param is invalid" do
    extra_book = Book.create!(id: "api_book_3", title: "La hojarasca", author: "García Márquez")
    BookAuthority.create!(book: extra_book, authority: @authority)
    BookConnection.create!(source_book: @book, target_book: extra_book, weight: 1)

    get api_catalog_graph_url(@book.id), params: { limit: "abc" }, as: :json

    assert_response :ok
    body = JSON.parse(response.body)
    connected_books = body["nodes"].select { |node| node["type"] == "connected_book" }
    assert_equal 2, connected_books.size
  end
end
