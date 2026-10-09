# frozen_string_literal: true

require "test_helper"

class HealthControllerTest < ActionDispatch::IntegrationTest
  test "should get healthz" do
    get "/healthz"
    assert_response :ok

    json_response = JSON.parse(response.body)
    assert_equal "ok", json_response["status"]
    assert_equal CURRENT_GIT_SHA, json_response["git_sha"]
  end
end
