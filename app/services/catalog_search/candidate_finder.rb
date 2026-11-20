# frozen_string_literal: true

module CatalogSearch
  class CandidateFinder
    CANDIDATE_LIMIT = 50
    SEARCH_RESULT_LIMIT = 500

    Result = Data.define(:books, :connection_counts, :embeddings_by_id, :candidate_sources, :query_matches_author)

    def call(normalized_query:, query_tokens:, significant_tokens:, query_embedding: nil, limit: 100)
      requested_limit = limit.to_i.clamp(1, SEARCH_RESULT_LIMIT)
      candidate_limit = [ CANDIDATE_LIMIT, requested_limit ].max.clamp(1, SEARCH_RESULT_LIMIT)
      candidate_sources = Hash.new { |h, k| h[k] = [] }

      tier_1a_ids = exact_phrase_ids(normalized_query, limit: candidate_limit)
      tier_1b_ids = ranked_word_ids(significant_tokens, limit: candidate_limit)
      tier_1c_ids = token_like_ids(significant_tokens, limit: candidate_limit)
      fuzzy_ids = FuzzyBookLookup.candidate_ids_for_tokens(significant_tokens)
      transposition_ids = FuzzyBookLookup.transposition_candidate_ids_for_tokens(significant_tokens)

      tier_1a_ids.each { |id| candidate_sources[id] << "phrase_exact" }
      tier_1b_ids.each { |id| candidate_sources[id] << "book_word_ranked" }
      tier_1c_ids.each { |id| candidate_sources[id] << "like_exact_prefix" }
      fuzzy_ids.each { |id| candidate_sources[id] << "fts_trigram" }
      transposition_ids.each { |id| candidate_sources[id] << "bounded_transposition" }

      merged_ids = (tier_1a_ids + tier_1b_ids + tier_1c_ids + fuzzy_ids + transposition_ids)
                   .uniq
                   .first(candidate_limit)

      embeddings_by_id = {}
      if query_embedding
        embeddings_by_id = EmbeddingStore.vectors_by_id
        semantic_ids = top_semantic_ids(query_embedding, embeddings_by_id, limit: candidate_limit)
        semantic_ids.each { |id| candidate_sources[id] << "semantic" }
        merged_ids = (merged_ids + semantic_ids).uniq.first(SEARCH_RESULT_LIMIT)
      end

      if merged_ids.empty?
        return Result.new(
          books: [],
          connection_counts: {},
          embeddings_by_id: embeddings_by_id,
          candidate_sources: candidate_sources,
          query_matches_author: false
        )
      end

      non_stopword_tokens = query_tokens.reject { |t| t.length < 3 || FuzzyText::SPANISH_STOPWORDS.include?(t) }
      books = Book.select(:id, :title, :author)
                  .includes(:authorities)
                  .where(id: merged_ids)
                  .to_a

      Result.new(
        books: books,
        connection_counts: BookConnection.counts_for(merged_ids),
        embeddings_by_id: embeddings_by_id,
        candidate_sources: candidate_sources,
        query_matches_author: query_matches_author?(non_stopword_tokens)
      )
    end

    private

    def search_expressions
      table = Book.arel_table
      if Book.column_names.include?("normalized_title") && Book.column_names.include?("normalized_author")
        [ table[:normalized_title], table[:normalized_author] ]
      else
        [
          Arel::Nodes::NamedFunction.new("LOWER", [ table[:title] ]),
          Arel::Nodes::NamedFunction.new("LOWER", [ table[:author] ])
        ]
      end
    end

    def exact_phrase_ids(normalized_query, limit:)
      return [] if normalized_query.blank?

      title_expr, author_expr = search_expressions
      like = "%#{ActiveRecord::Base.sanitize_sql_like(normalized_query)}%"
      Book.where(title_expr.matches(like).or(author_expr.matches(like)))
          .limit(limit)
          .pluck(:id)
    end

    def ranked_word_ids(tokens, limit:)
      return [] if tokens.empty?

      BookWord.where(word: tokens)
              .group(:book_id)
              .order(Arel.sql("COUNT(DISTINCT word) DESC"))
              .limit(limit)
              .pluck(:book_id)
    end

    def token_like_ids(tokens, limit:)
      return [] if tokens.empty?

      title_expr, author_expr = search_expressions
      predicates = tokens.flat_map do |tok|
        list = [ like_predicate(title_expr, author_expr, tok) ]
        list << like_predicate(title_expr, author_expr, tok[0, 5]) if tok.length >= 5
        list
      end
      return [] if predicates.empty?

      combined = predicates.reduce { |acc, pred| acc.or(pred) }
      Book.where(combined)
          .distinct
          .limit(limit)
          .pluck(:id)
    end

    def like_predicate(title_expr, author_expr, pattern)
      like = "%#{ActiveRecord::Base.sanitize_sql_like(pattern)}%"
      title_expr.matches(like).or(author_expr.matches(like))
    end

    def top_semantic_ids(query_embedding, vectors_by_id, limit:)
      scored = vectors_by_id.filter_map do |id, vector|
        cosine = Scorer.cosine_similarity(query_embedding, vector)
        next if cosine <= 0.0

        [ id, cosine ]
      end

      scored.sort_by! { |(_id, cosine)| -cosine }
      scored.first(limit).map(&:first)
    end

    def query_matches_author?(tokens)
      return false if tokens.empty?

      check_tokens = tokens.select { |t| t.length >= 4 }
      check_tokens = tokens if check_tokens.empty? && tokens.size == 1 && tokens.first.length >= 3
      return false if check_tokens.empty?

      if BookWord.where(source: "author").exists?
        matched = BookWord.where(source: "author", word: check_tokens).distinct.pluck(:word)
        check_tokens.all? { |tok| matched.include?(tok) }
      else
        _title_expr, author_expr = search_expressions
        check_tokens.all? do |tok|
          like = "%#{ActiveRecord::Base.sanitize_sql_like(tok)}%"
          Book.where(author_expr.matches(like)).exists?
        end
      end
    end
  end
end
