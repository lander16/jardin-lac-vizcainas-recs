class BooksController < ApplicationController
  def show
    @book = Book.find(params[:id])
    @checked_by = @book.patrons.order(:name)
    @similar_books = ContentSimilarity.where(book_id: @book.id)
                                      .order(similarity: :desc)
                                      .limit(10)
                                      .includes(:similar_book)
  end
end
