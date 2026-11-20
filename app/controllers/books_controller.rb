# frozen_string_literal: true

class BooksController < ApplicationController
  def show
    @book = Book.includes(:authorities).find(params[:id])
    @checked_by = @book.patrons.distinct.order(:name)
    @similar_books = SimilarBooksQuery.call(@book)
  end
end
