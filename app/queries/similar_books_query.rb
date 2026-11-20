# frozen_string_literal: true

class SimilarBooksQuery
  def self.call(book, limit: 10)
    new(book, limit: limit).call
  end

  def initialize(book, limit: 10)
    @book = book
    @limit = (limit || 10).to_i.clamp(1, 50)
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
                     .limit(limit * 2)
                     .includes(:book, :similar_book)
  end

  def map_content_similarities(content_sims)
    deduped = {}

    content_sims.each do |cs|
      target_book = (cs.book_id == book.id) ? cs.similar_book : cs.book
      next unless target_book

      existing = deduped[target_book.id]
      next if existing && existing[:similarity] >= cs.similarity

      deduped[target_book.id] = {
        book: target_book,
        similarity: cs.similarity,
        percentage: (cs.similarity * 100).round.clamp(0, 100),
        source_label: "Vectores (Embeddings Semánticos)"
      }
    end

    deduped.values.sort_by { |item| [ -item[:similarity], item[:book].title.to_s ] }.first(limit)
  end

  def fetch_shared_authorities
    book_auths = book.authorities.select(:id, :books_count).to_a
    return [] if book_auths.empty?

    idf_by_auth_id = book_auths.each_with_object({}) do |auth, map|
      map[auth.id] = 1.0 / Math.log2(auth.books_count + 2)
    end
    total_idf = idf_by_auth_id.values.sum
    return [] if total_idf <= 0.0

    shared_pairs = BookAuthority.where(authority_id: idf_by_auth_id.keys)
                                .where.not(book_id: book.id)
                                .pluck(:book_id, :authority_id)
    return [] if shared_pairs.empty?

    stats_by_book = Hash.new { |h, k| h[k] = { idf_sum: 0.0, count: 0 } }
    shared_pairs.each do |candidate_id, auth_id|
      entry = stats_by_book[candidate_id]
      entry[:idf_sum] += idf_by_auth_id[auth_id].to_f
      entry[:count] += 1
    end

    sorted_entries = stats_by_book.sort_by { |cid, s| [ -s[:idf_sum], cid ] }
    cutoff = sorted_entries[limit - 1]&.dig(1, :idf_sum)
    top_entries = cutoff ? sorted_entries.select { |_cid, s| s[:idf_sum] >= cutoff }.first(limit * 10) : sorted_entries

    books_by_id = Book.select(:id, :title, :author)
                      .where(id: top_entries.map(&:first))
                      .index_by(&:id)

    ranked = top_entries.filter_map do |candidate_id, stats|
      candidate = books_by_id[candidate_id]
      next unless candidate

      weighted_ratio = (stats[:idf_sum] / total_idf).clamp(0.0, 1.0)
      score_pct = [ ((weighted_ratio * 60) + 40).round, 98 ].min
      count = stats[:count]
      label = count == 1 ? "1 autoridad compartida" : "#{count} autoridades compartidas"

      {
        book: candidate,
        similarity: weighted_ratio,
        percentage: score_pct,
        source_label: label
      }
    end

    ranked.sort_by { |item| [ -item[:similarity], item[:book].title.to_s ] }.first(limit)
  end
end
