# frozen_string_literal: true

module Api
  class GraphsController < ActionController::Base
    def user
      patron = Patron.find(params[:id])
      limit = Integer(params[:limit], exception: false)&.clamp(1, 50) || 15
      render json: GraphDataService.user_graph(patron, limit: limit)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Lector no encontrado" }, status: :not_found
    end

    def catalog
      book = Book.find(params[:id])
      limit = Integer(params[:limit], exception: false)&.clamp(1, 50) || 15
      render json: GraphDataService.catalog_graph(book, limit: limit)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Libro no encontrado" }, status: :not_found
    end
  end
end
