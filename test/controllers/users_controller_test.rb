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
end
