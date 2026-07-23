module Api
  class GraphsController < ApplicationController
    def user
      patron = Patron.find(params[:id])
      limit = (params[:limit] || 15).to_i.clamp(1, 50)
      data = GraphDataService.user_graph(patron, limit: limit)
      render json: data
    rescue ActiveRecord::RecordNotFound
      render json: { error: "User not found" }, status: :not_found
    end

    def catalog
      book = Book.find(params[:id])
      limit = (params[:limit] || 15).to_i.clamp(1, 50)
      data = GraphDataService.catalog_graph(book, limit: limit)
      render json: data
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Book not found" }, status: :not_found
    end
  end
end
