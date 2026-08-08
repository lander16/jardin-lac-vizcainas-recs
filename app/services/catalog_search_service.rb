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

    # Load embeddings for the candidate shortlist in a single query
    # (BLOB column → Array<Float> via unpack).
    candidate_ids = candidates.map(&:id)
    embeddings_by_id = Book.where(id: candidate_ids)
                           .where.not(embedding: nil)
                           .pluck(:id, :embedding)
                           .to_h
                           .transform_values { |bytes| bytes&.unpack("e*") }

    scored = candidates.filter_map do |book|
      score_book(book, query_tokens, query_embedding, embeddings_by_id[book.id], w_semantic)
    end

    scored.sort_by! { |b| -b[:match_score] }
    scored.first(limit)
  end

  private

  def candidate_books(query_tokens)
    # SQL pre-filter with three tiers per query token so typos at the
    # SQL level still produce candidates for the Ruby Levenshtein
    # scorer to rank:
    #   1. Exact substring — e.g. '%pedro%' matches "Pedro".
    #   2. First-5-chars prefix (when the token is at least 5 chars)
    #      — catches typos at the end / transpositions toward the
    #      middle, e.g. '%shake%' matches "Shakespeare" when the
    #      query is "shakesrpeare" (r in the wrong place).
    #   3. 3-character substrings (trigrams) of the query — catches
    #      dropped first chars ("akespeare" → "shakespeare") and
    #      short mid-word transpositions ("pedrp" → "pedro").
    # Without these tiers, typo'd queries produce zero candidates and
    # the Levenshtein never runs.
    # Authority names are scored in Ruby on the shortlist (the cross-
    # table JOIN is expensive and rarely contributes more candidates
    # than the title/author LIKE).
    #
    # In parallel, the FTS5 trigram index (book_words_fts) is consulted
    # to find books whose dictionary words contain all of the query
    # token's trigrams. FTS5 handles cases the LIKE tiers miss (typos
    # that drop the first or last character of a word, e.g.
    # "akespeare" → "shakespeare") and LIKE covers the boundary-trigram
    # cases FTS5 misses (e.g. "hemingwy" → "hemingway"). The index is
    # disk-backed inside SQLite, so unlike the old in-memory SymSpell
    # index it costs no Ruby heap space.
    #
    # The two candidate sources are OR'd via ActiveRecord::Relation#or
    # instead of being merged into a single SQL string. This keeps
    # each side using Rails' built-in safe parameter binding (so the
    # book_ids list — which comes from the DB, not user input —
    # can't trigger a SQL injection false positive in brakeman).
    base = Book.includes(:authorities)
    conditions = []
    bindings = []
    query_tokens.each do |tok|
      add_like(conditions, bindings, tok)

      if tok.length >= 5
        add_like(conditions, bindings, tok[0, 5])
      end

      trigrams_of(tok).each { |tri| add_like(conditions, bindings, tri) }
    end

    scopes = []
    scopes << base.where(conditions.join(" OR "), *bindings) if conditions.any?

    fuzzy_ids = fuzzy_candidate_ids(query_tokens)
    scopes << base.where(books: { id: fuzzy_ids }) if fuzzy_ids.any?

    return base.none if scopes.empty?

    scopes.reduce { |acc, s| acc.or(s) }.distinct.limit(CANDIDATE_LIMIT)
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

  def score_book(book, query_tokens, query_embedding, book_embedding, w_semantic)
    norm_title = normalize_text(book.title)
    norm_author = normalize_text(book.author || "")
    norm_authorities = book.authorities.map { |a| normalize_text(a.name) }

    title_score = calculate_token_score(query_tokens, norm_title)
    author_score = calculate_token_score(query_tokens, norm_author)
    auth_scores = norm_authorities.map { |a| calculate_token_score(query_tokens, a) }
    best_auth_score = auth_scores.max || 0.0

    weighted_title = title_score * WEIGHTS[:title]
    weighted_author = author_score * WEIGHTS[:author]
    weighted_auth = best_auth_score * WEIGHTS[:authority]

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
