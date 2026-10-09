require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @patron = Patron.create!(id: "p_test_1", name: "Adriana Cortés", email: "adriana@test.com", cardnumber: "12345")
    @book = Book.create!(id: "b_test_1", title: "Cien Años de Soledad", author: "García Márquez")
    @book2 = Book.create!(id: "b_test_2", title: "El Amor en los Tiempos del Cólera", author: "García Márquez")
    Checkout.create!(patron: @patron, book: @book)
    ContentSimilarity.create!(book: @book, similar_book: @book2, similarity: 0.8)
  end

  test "should get user recommendations page" do
    get user_url(@patron.id)
    assert_response :success
    assert_select "h1", text: /Adriana Cortés/
    assert_select ".source-badge.content", text: /Contenido/
    assert_select "button[aria-controls='explanation-b_test_2']"
  end

  test "should get user graph page" do
    get user_graph_url(@patron.id)
    assert_response :success
  end

  test "should return recommendations turbo frame" do
    get user_recommendations_frame_url(@patron.id), params: { w_content: 1.0, w_collab: 0.0, w_auth: 0.0 }
    assert_response :success
    assert_select "turbo-frame[id='recommendations-list']"
    assert_select ".source-badge.content", text: /Contenido/
    assert_select "button[aria-controls='explanation-b_test_2']"
  end
end
