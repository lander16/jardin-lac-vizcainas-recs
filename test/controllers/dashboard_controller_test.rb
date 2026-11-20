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

  test "users search matches accented patron names with unaccented queries" do
    Patron.create!(id: "dash_maria", name: "María Pérez", email: "maria@test.com", cardnumber: "DASH-101")
    Patron.create!(id: "dash_carlos", name: "Carlos Ruiz", email: "carlos@test.com", cardnumber: "DASH-102")

    get users_search_url, params: { q: "Maria" }

    assert_response :success
    assert_select "turbo-frame#users-table table", count: 1
    assert_match "María Pérez", response.body
    assert_no_match "Carlos Ruiz", response.body
  end

  test "users-table turbo-frame wraps table instead of nesting inside table" do
    Patron.create!(id: "dash_elena", name: "Elena Poniatowska", email: "elena@test.com", cardnumber: "DASH-103")

    [ root_url, users_search_url ].each do |endpoint|
      get endpoint

      assert_response :success
      assert_select "turbo-frame#users-table table", count: 1
      assert_select "table turbo-frame#users-table", count: 0
      assert_no_match(/<table\b[^>]*>\s*<turbo-frame/i, response.body)
    end
  end
end
