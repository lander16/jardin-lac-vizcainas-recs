# frozen_string_literal: true

module CatalogSearch
  module Scorer
    WEIGHTS = { title: 1.0, author: 1.1, authority: 0.7 }.freeze
    THRESHOLD = 50.0
    MIN_SEMANTIC_COSINE = 0.38
    DEFAULT_W_SEMANTIC = 0.35

    module_function

    def score_book(book:, query_tokens:, query_embedding:, book_embedding:, connection_count:, w_semantic:, suppress_authority: false, debug: false, candidate_sources: [])
      w = clamp_semantic_weight(w_semantic)
      norm_title = FuzzyText.normalize_text(book.title)
      norm_author = FuzzyText.normalize_text(book.author || "")

      title_score = calculate_token_score(query_tokens, norm_title)
      author_score = calculate_token_score(query_tokens, norm_author)

      best_auth_score = 0.0
      best_authority_name = nil
      book.authorities.each do |authority|
        score = calculate_token_score(query_tokens, FuzzyText.normalize_text(authority.name))
        if score > best_auth_score
          best_auth_score = score
          best_authority_name = authority.name
        end
      end

      weighted_title = title_score * WEIGHTS[:title]
      weighted_author = author_score * WEIGHTS[:author]
      weighted_auth = suppress_authority ? 0.0 : (best_auth_score * WEIGHTS[:authority])

      token_score = [ weighted_title, weighted_author, weighted_auth ].max

      semantic_cosine = nil
      semantic_score = 0.0
      if query_embedding && book_embedding
        semantic_cosine = cosine_similarity(query_embedding, book_embedding)
        semantic_score = [ semantic_cosine, 0.0 ].max * 100.0
      end

      literal_ok = token_score >= THRESHOLD
      semantic_ok = !!(query_embedding && book_embedding && semantic_cosine >= MIN_SEMANTIC_COSINE)
      return nil unless literal_ok || semantic_ok

      final = if token_score > 0.0 && query_embedding && book_embedding
                ((1.0 - w) * token_score) + (w * semantic_score)
      elsif token_score == 0.0
                [ semantic_score * 0.85, 25.0 ].max
      else
                token_score
      end

      explanation = Explainer.call(
        book: book,
        token_score: token_score,
        weighted_title: weighted_title,
        weighted_author: weighted_author,
        weighted_authority: weighted_auth,
        best_authority_name: best_authority_name,
        semantic_cosine: semantic_cosine
      )

      result = {
        biblio_id: book.id,
        title: book.title,
        author: book.author,
        authority_count: book.authorities.size,
        connection_count: connection_count,
        authorities: book.authorities.map { |a| { authority_id: a.id, name: a.name, type: a.authority_type } },
        match_score: final.round(1),
        match_explanation: explanation,
        semantic_score: semantic_cosine&.round(3)
      }

      if debug
        result[:candidate_sources] = candidate_sources.uniq
        result[:score_components] = {
          title: weighted_title.round(1),
          author: weighted_author.round(1),
          authority: weighted_auth.round(1),
          token: token_score.round(1),
          semantic: semantic_score.round(1),
          final: final.round(1)
        }
      end

      result
    end

    def calculate_token_score(query_tokens, target_text)
      return 0.0 if target_text.blank? || query_tokens.empty?

      target_tokens = target_text.split(" ").reject(&:blank?)
      return 0.0 if target_tokens.empty?

      token_scores = query_tokens.map do |qt|
        best_t_score = 0.0
        target_tokens.each do |tt|
          if tt == qt
            best_t_score = 100.0
            break
          elsif tt.start_with?(qt) && qt.length >= 3
            score = 100.0 - ((tt.length - qt.length) * 5)
            best_t_score = [ best_t_score, [ score, 60.0 ].max ].max
          elsif qt.start_with?(tt) && tt.length >= 3
            score = 100.0 - ((qt.length - tt.length) * 5)
            best_t_score = [ best_t_score, [ score, 60.0 ].max ].max
          elsif qt.length >= 4 && tt.length >= 4
            dist = FuzzyText.damerau_levenshtein_distance(qt, tt)
            max_len = [ qt.length, tt.length ].max.to_f
            similarity_ratio = 1.0 - (dist.to_f / max_len)
            if dist <= 2 || similarity_ratio >= 0.7
              score = similarity_ratio * 100.0
              best_t_score = [ best_t_score, score ].max
            end
          end
        end
        best_t_score
      end

      token_scores.sum / token_scores.size.to_f
    end

    def cosine_similarity(a, b)
      return 0.0 if a.nil? || b.nil? || a.empty? || a.length != b.length

      sum = 0.0
      i = 0
      while i < a.length
        sum += a[i] * b[i]
        i += 1
      end
      sum
    end

    def clamp_semantic_weight(w_semantic)
      raw = w_semantic.nil? ? DEFAULT_W_SEMANTIC : Float(w_semantic)
      raw.clamp(0.0, 1.0)
    rescue ArgumentError, TypeError
      DEFAULT_W_SEMANTIC
    end
  end
end
