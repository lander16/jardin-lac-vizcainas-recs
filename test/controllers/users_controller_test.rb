require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @patron = Patron.create!(id: "p_test_1", name: "Adriana Cortés", email: "adriana@test.com", cardnumber: "12345")
    @book = Book.create!(id: "b_test_1", title: "Cien Años de Soledad", author: "García Márquez")
    Checkout.create!(patron: @patron, book: @book)
  end

  test "should get user recommendations page" do
    get user_url(@patron.id)
    assert_response :success
    assert_select "h1", text: /Adriana Cortés/
  end

  test "should get user graph page" do
    get user_graph_url(@patron.id)
    assert_response :success
  end

  test "should return recommendations turbo frame" do
    get user_recommendations_frame_url(@patron.id), params: { w_content: 0.5, w_collab: 0.3, w_auth: 0.2 }
    assert_response :success
    assert_select "turbo-frame[id='recommendations-list']"
  end

  test "should search books for checkout in modal" do
    get user_checkout_search_url(@patron.id), params: { q: "Cien" }
    assert_response :success
    assert_select "turbo-frame[id='checkout-search-results']"
  end

  test "should perform checkout" do
    new_book = Book.create!(id: "b_test_2", title: "El Amor en los Tiempos del Cólera", author: "García Márquez")
    post user_checkout_url(@patron.id), params: { book_id: new_book.id }
    assert_redirected_to user_path(@patron.id)
    assert Checkout.exists?(patron: @patron, book: new_book)
  end
end
