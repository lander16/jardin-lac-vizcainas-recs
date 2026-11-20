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

  test "should render split-view layout without inline onclick or onchange handlers" do
    get user_url(@patron.id)

    assert_response :success
    assert_select ".split-view[data-controller='balance']", count: 1
    assert_select "[onclick], [onchange]", count: 0
    assert_no_match(/\s+on(?:click|change)\s*=/i, response.body)
  end

  test "normalizes valid unnormalized weights on user show" do
    get user_url(@patron.id), params: { w_content: "0.5", w_collab: "0.5", w_auth: "1.0" }

    assert_response :success
    assert_select "input#slider-content[value='0.25']"
    assert_select "[data-balance-target='contentVal']", text: "25%"
    assert_select "input#slider-collab[value='0.25']"
    assert_select "[data-balance-target='collabVal']", text: "25%"
    assert_select "input#slider-auth[value='0.5']"
    assert_select "[data-balance-target='authVal']", text: "50%"
  end

  test "normalizes partial weights on user show and recommendations frame" do
    peer = Patron.create!(id: "p_test_2", name: "Luis Gómez", email: "luis@test.com", cardnumber: "67890")
    collab_book = Book.create!(id: "b_test_3", title: "Rayuela", author: "Julio Cortázar")
    Checkout.create!(patron: peer, book: collab_book)
    UserSimilarity.create!(patron: @patron, similar_patron: peer, jaccard_score: 0.9)

    get user_url(@patron.id), params: { w_content: "0.5", w_collab: "0.5" }

    assert_response :success
    assert_select "input#slider-content[value='0.5']"
    assert_select "[data-balance-target='contentVal']", text: "50%"
    assert_select "input#slider-collab[value='0.5']"
    assert_select "[data-balance-target='collabVal']", text: "50%"
    assert_select "input#slider-auth[value='0.0']"
    assert_select "[data-balance-target='authVal']", text: "0%"

    get user_recommendations_frame_url(@patron.id), params: { w_collab: "0.8" }

    assert_response :success
    assert_select "turbo-frame[id='recommendations-list']"
    assert_select ".source-badge.collaborative", text: /Lectores Afines/
    assert_match collab_book.title, response.body
    assert_no_match @book2.title, response.body
    assert_select "[onclick], [onchange]", count: 0
    assert_no_match(/\s+on(?:click|change)\s*=/i, response.body)
  end
end
