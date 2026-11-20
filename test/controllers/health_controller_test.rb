# frozen_string_literal: true

require "test_helper"

class HealthControllerTest < ActionDispatch::IntegrationTest
  test "should get healthz" do
    get "/healthz"
    assert_response :ok

    json_response = JSON.parse(response.body)
    assert_equal "ok", json_response["status"]
    assert_equal CURRENT_GIT_SHA, json_response["git_sha"]
    assert_not json_response.key?("ruby")
    assert_not_includes response.body, RUBY_DESCRIPTION
  end

  test "should redact raw exception details on 500 error" do
    had_singleton = Book.singleton_methods(false).include?(:count)
    original = Book.method(:count) if had_singleton
    Book.define_singleton_method(:count) do |*_args|
      raise ActiveRecord::StatementInvalid, "SQLite3::SQLException: no such table: secret_books"
    end

    get "/healthz"

    assert_response :internal_server_error
    json_response = JSON.parse(response.body)
    assert_equal({ "status" => "error" }, json_response)
    assert_not json_response.key?("error")
    assert_not json_response.key?("message")
    assert_not_includes response.body, "StatementInvalid"
    assert_not_includes response.body, "secret_books"
  ensure
    if had_singleton
      Book.define_singleton_method(:count, original)
    else
      Book.singleton_class.remove_method(:count)
    end
  end

  test "should allow legacy user agents on healthz" do
    get "/healthz", headers: {
      "HTTP_USER_AGENT" => "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)"
    }

    assert_response :ok
    assert_equal "ok", JSON.parse(response.body)["status"]
  end
end
