class BooksController < ApplicationController
  def show
    @book = Book.find(params[:id])
    @checked_by = @book.patrons.order(:name)

    # 1. Primary: Vector similarity from TF-IDF ContentSimilarity
    content_sims = ContentSimilarity.where(book_id: @book.id)
                                    .or(ContentSimilarity.where(similar_book_id: @book.id))
                                    .order(similarity: :desc)
                                    .limit(10)
                                    .includes(:book, :similar_book)

    if content_sims.any?
      @similar_books = content_sims.map do |cs|
        target_book = (cs.book_id == @book.id) ? cs.similar_book : cs.book
        {
          book: target_book,
          similarity: cs.similarity,
          percentage: (cs.similarity * 100).round,
          source_label: "Vectores (TF-IDF)"
        }
      end
    else
      # 2. Fallback: Shared authorities & catalog metadata
      auth_ids = @book.authority_ids
      if auth_ids.any?
        candidates = Book.joins(:book_authorities)
                         .where(book_authorities: { authority_id: auth_ids })
                         .where.not(id: @book.id)
                         .group("books.id")
                         .select("books.*, COUNT(book_authorities.authority_id) as shared_count")
                         .order("shared_count DESC, books.title ASC")
                         .limit(10)

        max_possible = [ auth_ids.size, 1 ].max.to_f

        @similar_books = candidates.map do |b|
          shared_ratio = (b.shared_count.to_f / max_possible)
          score_pct = [ ((shared_ratio * 60) + 40).round, 98 ].min
          {
            book: b,
            similarity: shared_ratio,
            percentage: score_pct,
            source_label: "#{b.shared_count} autoridades compartidas"
          }
        end
      else
        @similar_books = []
      end
    end
  end
end
