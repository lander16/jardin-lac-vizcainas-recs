# frozen_string_literal: true

require "test_helper"

class ErrorsControllerTest < ActionDispatch::IntegrationTest
  ERROR_CASES = [
    { path: "/400", status: 400, heading: "Solicitud Inválida (400)", message: "Solicitud incorrecta" },
    { path: "/404", status: 404, heading: "Registro no Encontrado (404)", message: "Recurso no encontrado" },
    { path: "/422", status: 422, heading: "Operación no Procesable (422)", message: "Entidad no procesable" },
    { path: "/500", status: 500, heading: "Error Temporal en el Servidor (500)", message: "Error interno del servidor" }
  ].freeze

  test "renders HTML error pages with expected status and Spanish headings" do
    ERROR_CASES.each do |error_case|
      get error_case[:path]

      assert_response error_case[:status]
      assert_select "h1.error-title", text: error_case[:heading]
    end
  end

  test "renders JSON error payloads with expected status and Spanish messages" do
    ERROR_CASES.each do |error_case|
      get error_case[:path], as: :json

      assert_response error_case[:status]
      assert_equal({ "error" => error_case[:message] }, JSON.parse(response.body))
    end
  end

  test "renders head status without error for text/plain requests" do
    ERROR_CASES.each do |error_case|
      get error_case[:path], headers: { "Accept" => "text/plain" }

      assert_response error_case[:status]
      assert_empty response.body
    end
  end
end
