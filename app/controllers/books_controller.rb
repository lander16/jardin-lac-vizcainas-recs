class BooksController < ApplicationController
  def show
    @book = Book.find(params[:id])
    @checked_by = @book.patrons.order(:name)
    @similar_books = SimilarBooksQuery.call(@book)
  end
end
