# frozen_string_literal: true

class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

  private

  def render_not_found
    respond_to do |format|
      format.html { render "errors/not_found", status: :not_found, layout: "application" }
      format.json { render json: { error: "Recurso no encontrado" }, status: :not_found }
      format.any { head :not_found }
    end
  end
end
