# frozen_string_literal: true

class CatalogSearchService
  WEIGHTS = CatalogSearch::Scorer::WEIGHTS
  THRESHOLD = CatalogSearch::Scorer::THRESHOLD
  SEMANTIC_THRESHOLD = 25.0
  MIN_SEMANTIC_COSINE = CatalogSearch::Scorer::MIN_SEMANTIC_COSINE
  DEFAULT_W_SEMANTIC = CatalogSearch::Scorer::DEFAULT_W_SEMANTIC
  CANDIDATE_LIMIT = CatalogSearch::CandidateFinder::CANDIDATE_LIMIT
  SEARCH_RESULT_LIMIT = CatalogSearch::CandidateFinder::SEARCH_RESULT_LIMIT

  def self.search(query, limit: 100, w_semantic: DEFAULT_W_SEMANTIC, debug: false)
    new.search(query, limit: limit, w_semantic: w_semantic, debug: debug)
  end

  def search(query, limit: 100, w_semantic: DEFAULT_W_SEMANTIC, debug: false)
    return [] if query.blank?

    normalized_query = FuzzyText.normalize_text(query)
    query_tokens = normalized_query.split(" ").reject(&:blank?)
    return [] if query_tokens.empty?

    non_stopword_tokens = query_tokens.reject { |t| t.length < 3 || FuzzyText::SPANISH_STOPWORDS.include?(t) }
    significant_tokens = non_stopword_tokens.empty? ? query_tokens : non_stopword_tokens

    embedder = QueryEmbedder.default
    query_embedding = embedder.available? ? embedder.encode(query) : nil
    requested_limit = limit.to_i.clamp(1, SEARCH_RESULT_LIMIT)

    candidates = CatalogSearch::CandidateFinder.new.call(
      normalized_query: normalized_query,
      query_tokens: query_tokens,
      significant_tokens: significant_tokens,
      query_embedding: query_embedding,
      limit: requested_limit
    )
    return [] if candidates.books.empty?

    scored = candidates.books.filter_map do |book|
      CatalogSearch::Scorer.score_book(
        book: book,
        query_tokens: significant_tokens,
        query_embedding: query_embedding,
        book_embedding: candidates.embeddings_by_id[book.id],
        connection_count: candidates.connection_counts[book.id] || 0,
        w_semantic: w_semantic,
        suppress_authority: candidates.query_matches_author,
        debug: debug,
        candidate_sources: candidates.candidate_sources[book.id]
      )
    end

    scored.sort_by! { |b| [ -b[:match_score], -(b[:semantic_score] || 0.0), b[:title].to_s, b[:biblio_id].to_s ] }
    scored.first(requested_limit)
  end
end
