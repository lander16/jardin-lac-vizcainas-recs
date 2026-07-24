require "test_helper"

class DashboardControllerTest < ActionDispatch::IntegrationTest
  test "should get show" do
    get root_url
    assert_response :success
    assert_select "h1", text: /Sistema de Recomendaciones/
  end

  test "should search users with turbo frame" do
    get users_search_url, params: { q: "test" }
    assert_response :success
    assert_select "turbo-frame[id='users-table']"
  end
end
