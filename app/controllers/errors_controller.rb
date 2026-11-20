# frozen_string_literal: true

class ErrorsController < ActionController::Base
  layout "application"
  skip_forgery_protection

  def bad_request
    render_error(status: :bad_request, template: "errors/bad_request", message: "Solicitud incorrecta")
  end

  def not_found
    render_error(status: :not_found, template: "errors/not_found", message: "Recurso no encontrado")
  end

  def unprocessable_entity
    render_error(status: :unprocessable_entity, template: "errors/unprocessable_entity", message: "Entidad no procesable")
  end

  def internal_server_error
    render_error(status: :internal_server_error, template: "errors/internal_server_error", message: "Error interno del servidor")
  end

  private

  def render_error(status:, template:, message:)
    respond_to do |format|
      format.html do
        if template_exists?(template)
          render template, status: status
        else
          render plain: message, status: status
        end
      end
      format.json { render json: { error: message }, status: status }
      format.any { head status }
    end
  end
end
