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
    assert body["nodes"].any? { |node| node["id"] == @patron.id && node["type"] == "target_user" }
  end

  test "returns successful catalog graph json" do
    get api_catalog_graph_url(@book.id), as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_kind_of Array, body["nodes"]
    assert_kind_of Array, body["links"]
    assert body["nodes"].any? { |node| node["id"] == @book.id && node["type"] == "target_book" }
  end

  test "returns json 404 for missing user" do
    get api_user_graph_url("missing-user"), as: :json

    assert_response :not_found
    assert_equal "User not found", JSON.parse(response.body)["error"]
  end

  test "returns json 404 for missing book" do
    get api_catalog_graph_url("missing-book"), as: :json

    assert_response :not_found
    assert_equal "Book not found", JSON.parse(response.body)["error"]
  end
end
