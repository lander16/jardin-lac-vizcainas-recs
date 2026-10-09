# frozen_string_literal: true

class SimilarBooksQuery
  def self.call(book, limit: 10)
    new(book, limit: limit).call
  end

  def initialize(book, limit: 10)
    @book = book
    @limit = limit
  end

  def call
    return [] unless book

    content_sims = fetch_content_similarities
    if content_sims.any?
      map_content_similarities(content_sims)
    else
      fetch_shared_authorities
    end
  end
  alias resolve call

  private

  attr_reader :book, :limit

  def fetch_content_similarities
    ContentSimilarity.where(book_id: book.id)
                     .or(ContentSimilarity.where(similar_book_id: book.id))
                     .order(similarity: :desc)
                     .limit(limit)
                     .includes(:book, :similar_book)
  end

  def map_content_similarities(content_sims)
    content_sims.map do |cs|
      target_book = (cs.book_id == book.id) ? cs.similar_book : cs.book
      {
        book: target_book,
        similarity: cs.similarity,
        percentage: (cs.similarity * 100).round,
        source_label: "Vectores (Embeddings Semánticos)"
      }
    end
  end

  def fetch_shared_authorities
    auth_ids = book.authority_ids
    return [] if auth_ids.empty?

    candidates = Book.joins(:book_authorities)
                     .where(book_authorities: { authority_id: auth_ids })
                     .where.not(id: book.id)
                     .group("books.id")
                     .select("books.*, COUNT(book_authorities.authority_id) as shared_count")
                     .order("shared_count DESC, books.title ASC")
                     .limit(limit)

    max_possible = [ auth_ids.size, 1 ].max.to_f

    candidates.map do |b|
      shared_ratio = (b.shared_count.to_f / max_possible)
      score_pct = [ ((shared_ratio * 60) + 40).round, 98 ].min
      {
        book: b,
        similarity: shared_ratio,
        percentage: score_pct,
        source_label: "#{b.shared_count} autoridades compartidas"
      }
    end
  end
end
