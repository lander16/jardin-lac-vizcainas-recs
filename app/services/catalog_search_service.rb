class CatalogSearchService
  WEIGHTS = { title: 1.0, author: 1.1, authority: 0.7 }.freeze
  THRESHOLD = 50.0
  SEMANTIC_THRESHOLD = 25.0
  DEFAULT_W_SEMANTIC = 0.35
  # Tightened from 200 -> 50 to cut memory + scoring time on Render
  # free tier. 50 candidates is still more than enough for the
  # Levenshtein + semantic scoring to surface the right book at
  # the top of the top-100 results.
  CANDIDATE_LIMIT = 50

  def self.search(query, limit: 100, w_semantic: DEFAULT_W_SEMANTIC)
    new.search(query, limit: limit, w_semantic: w_semantic)
  end

  def search(query, limit: 100, w_semantic: DEFAULT_W_SEMANTIC)
    return [] if query.blank?

    normalized_query = normalize_text(query)
    query_tokens = normalized_query.split(/\s+/).reject(&:blank?)
    return [] if query_tokens.empty?

    # Only ask the embedder for a vector if the runtime model is
    # available; otherwise the search degrades to token-only.
    embedder = QueryEmbedder.default
    query_embedding = embedder.available? ? embedder.encode(query) : nil

    candidates = candidate_books(query_tokens)
    return [] if candidates.empty?

    # When any query token matches an existing author name, suppress
    # the authority-tier contribution to the score. Books that merely
    # have the query's word as an authority tag (e.g. Rexroth's "Cita
    # con los clásicos", which lists Shakespeare among ~30 classical-
    # author authorities) would otherwise match the search and pollute
    # the result set. Multi-word topic queries (e.g. "mexican revolution")
    # don't match any author name, so authority matching still works
    # for them.
    query_matches_author = query_tokens.any? do |tok|
      next false if tok.length < 3
      Book.where("LOWER(author) LIKE ?", "%#{ActiveRecord::Base.sanitize_sql_like(tok)}%").exists?
    end

    # Load embeddings for the candidate shortlist in a single query
    # (BLOB column → Array<Float> via unpack).
    candidate_ids = candidates.map(&:id)
    embeddings_by_id = Book.where(id: candidate_ids)
                           .where.not(embedding: nil)
                           .pluck(:id, :embedding)
                           .to_h
                           .transform_values { |bytes| bytes&.unpack("e*") }

    scored = candidates.filter_map do |book|
      score_book(book, query_tokens, query_embedding, embeddings_by_id[book.id], w_semantic, suppress_authority: query_matches_author)
    end

    scored.sort_by! { |b| -b[:match_score] }
    scored.first(limit)
  end

  private

  def candidate_books(query_tokens)
    # Two candidate sources, merged with the LIKE-exact results FIRST
    # so the FTS5 fuzzy results only fill the remaining slots:
    #
    #   1. LIKE exact + prefix  (always wins when it matches)
    #        - '%shakespeare%'  matches the 11 Shakespeare-author books
    #        - '%shake%'        catches end-of-word typos
    #   2. FTS5 fuzzy match  (filler, up to CANDIDATE_LIMIT)
    #        - trigram tokenizer handles 'pedrp' -> 'pedro' and
    #          'shakesrpeare' -> 'shakespeare' when the exact tier
    #          doesn't find them
    #
    # The order matters: if we just OR'd them with a single LIMIT,
    # FTS5's noisy common-trigram matches (e.g. 'sha', 'ake') fill
    # the 50-candidate cap and push the real targets out. Doing
    # the merge in Ruby with the exact tier first guarantees the
    # precise matches always make it into the candidate set.
    base = Book.includes(:authorities)
    conditions = []
    bindings = []
    query_tokens.each do |tok|
      add_like(conditions, bindings, tok)
      if tok.length >= 5
        add_like(conditions, bindings, tok[0, 5])
      end
    end

    like_ids = conditions.any? ? base.where(conditions.join(" OR "), *bindings).distinct.pluck(:id) : []
    fuzzy_ids = fuzzy_candidate_ids(query_tokens)

    # Exact + prefix matches first, then FTS5 fuzzy matches to fill.
    # uniq preserves order; .first(CANDIDATE_LIMIT) keeps the rank.
    merged_ids = (like_ids + fuzzy_ids).uniq.first(CANDIDATE_LIMIT)
    return base.none if merged_ids.empty?

    base.where(books: { id: merged_ids })
  end

  # Look up each query token in the FTS5 trigram index and union the
  # returned book_ids. The query_tokens passed in are already
  # normalized (lowercased + diacritics stripped) by the search
  # method, matching how the index stores its words.
  def fuzzy_candidate_ids(query_tokens)
    FuzzyBookLookup.candidate_ids_for_tokens(query_tokens)
  end

  def add_like(conditions, bindings, pattern)
    like = "%#{ActiveRecord::Base.sanitize_sql_like(pattern)}%"
    conditions << "(LOWER(books.title) LIKE ? OR LOWER(books.author) LIKE ?)"
    bindings << like
    bindings << like
  end

  def trigrams_of(text)
    return [] if text.length < 3
    (0..text.length - 3).map { |i| text[i, 3] }.uniq
  end

  def score_book(book, query_tokens, query_embedding, book_embedding, w_semantic, suppress_authority: false)
    norm_title = normalize_text(book.title)
    norm_author = normalize_text(book.author || "")
    norm_authorities = book.authorities.map { |a| normalize_text(a.name) }

    title_score = calculate_token_score(query_tokens, norm_title)
    author_score = calculate_token_score(query_tokens, norm_author)
    auth_scores = norm_authorities.map { |a| calculate_token_score(query_tokens, a) }
    best_auth_score = auth_scores.max || 0.0

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

    # Hybrid blend: only kicks in when both token + semantic are
    # available. If the book has no embedding, keep the legacy pure
    # token score (so a typo'd query still returns literal matches).
    final = if query_embedding && book_embedding
              (1.0 - w_semantic) * token_score + w_semantic * semantic_score
    else
              token_score
    end

    threshold = query_embedding ? SEMANTIC_THRESHOLD : THRESHOLD
    return nil if final < threshold

    explanation = build_explanation(
      book, query_tokens,
      weighted_title, weighted_author, weighted_auth,
      semantic_cosine
    )

    {
      biblio_id: book.id,
      title: book.title,
      author: book.author,
      authority_count: book.authorities.size,
      connection_count: book.outgoing_connections.size + book.incoming_connections.size,
      authorities: book.authorities.map { |a| { authority_id: a.id, name: a.name, type: a.authority_type } },
      match_score: final.round(1),
      match_explanation: explanation,
      semantic_score: semantic_cosine&.round(3)
    }
  end

  def build_explanation(book, query_tokens, wt, wa, wauth, semantic_cosine)
    primary = if wa >= wt && wa >= wauth
                "Coincidencia en autor: '#{book.author}'"
    elsif wt >= wauth
                "Coincidencia en título: '#{book.title}'"
    else
                matched_auth = book.authorities.find do |a|
                                  calculate_token_score(query_tokens, normalize_text(a.name)) >= THRESHOLD / WEIGHTS[:authority]
                                end
                "Coincidencia en autoridad: '#{matched_auth&.name || 'Descriptor'}'"
    end

    if semantic_cosine && semantic_cosine >= 0.3
      primary + " · Coincidencia semántica (coseno #{semantic_cosine.round(2)})"
    else
      primary
    end
  end

  def normalize_text(text)
    return "" if text.blank?
    I18n.transliterate(text.to_s.downcase)
        .gsub(/[^a-z0-9\s]/, " ")
        .strip
  end

  def calculate_token_score(query_tokens, target_text)
    return 0.0 if target_text.blank?

    target_tokens = target_text.split(/\s+/).reject(&:blank?)
    return 0.0 if target_tokens.empty?

    token_scores = query_tokens.map do |qt|
      best_t_score = 0.0
      target_tokens.each do |tt|
        if tt == qt
          best_t_score = 100.0
        elsif tt.start_with?(qt) && qt.length >= 3
          score = 100.0 - ((tt.length - qt.length) * 5)
          best_t_score = [ best_t_score, [ score, 60.0 ].max ].max
        elsif qt.start_with?(tt) && tt.length >= 3
          score = 100.0 - ((qt.length - tt.length) * 5)
          best_t_score = [ best_t_score, [ score, 60.0 ].max ].max
        elsif qt.length >= 4 && tt.length >= 4
          dist = levenshtein_distance(qt, tt)
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

  def levenshtein_distance(str1, str2)
    s1 = str1.chars
    s2 = str2.chars
    d = Array.new(s1.size + 1) { Array.new(s2.size + 1, 0) }

    (0..s1.size).each { |i| d[i][0] = i }
    (0..s2.size).each { |j| d[0][j] = j }

    (1..s1.size).each do |i|
      (1..s2.size).each do |j|
        cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1
        d[i][j] = [
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        ].min
      end
    end

    d[s1.size][s2.size]
  end

  def cosine_similarity(a, b)
    return 0.0 if a.nil? || b.nil? || a.empty? || b.empty?
    sum = 0.0
    i = 0
    while i < a.length
      sum += a[i] * b[i]
      i += 1
    end
    sum
  end
end
