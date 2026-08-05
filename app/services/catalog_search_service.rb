class CatalogSearchService
  WEIGHTS = { title: 1.0, author: 1.1, authority: 0.7 }.freeze
  THRESHOLD = 50.0

  def self.search(query, limit: 100)
    new.search(query, limit: limit)
  end

  def search(query, limit: 100)
    return [] if query.blank?

    normalized_query = normalize_text(query)
    query_tokens = normalized_query.split(/\s+/).reject(&:blank?)
    return [] if query_tokens.empty?

    # Retrieve all books with loaded authorities
    books = Book.includes(:authorities).all
    scored_books = []

    books.each do |book|
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

      best_score = [ weighted_title, weighted_author, weighted_auth ].max

      next if best_score < THRESHOLD

      explanation = if weighted_author >= weighted_title && weighted_author >= weighted_auth
                      "Coincidencia en autor: '#{book.author}'"
      elsif weighted_title >= weighted_auth
                      "Coincidencia en título: '#{book.title}'"
      else
                      matched_auth = book.authorities.find { |a| calculate_token_score(query_tokens, normalize_text(a.name)) >= THRESHOLD }
                      "Coincidencia en autoridad: '#{matched_auth&.name || 'Descriptor'}'"
      end

      scored_books << {
        biblio_id: book.id,
        title: book.title,
        author: book.author,
        authority_count: book.authorities.size,
        connection_count: book.outgoing_connections.size + book.incoming_connections.size,
        authorities: book.authorities.map { |a| { authority_id: a.id, name: a.name, type: a.authority_type } },
        match_score: best_score.round(1),
        match_explanation: explanation
      }
    end

    scored_books.sort_by! { |b| -b[:match_score] }
    scored_books.first(limit)
  end

  private

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
end
