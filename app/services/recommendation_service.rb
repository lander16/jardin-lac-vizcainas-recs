class RecommendationService
  def initialize(patron)
    @patron = patron
    @checked_book_ids = patron.checkouts.pluck(:book_id).map(&:to_s).to_set
  end

  def recommend(w_content: nil, w_collab: nil, w_auth: nil, alpha: nil, limit: 30)
    # Parse weights
    if w_content.nil? && w_collab.nil? && w_auth.nil?
      a = alpha ? alpha.to_f.clamp(0.0, 1.0) : 0.33
      w_content = a
      w_collab = (1.0 - a).round(4)
      w_auth = 0.0
    else
      w_content = (w_content || 0.33).to_f
      w_collab = (w_collab || 0.33).to_f
      w_auth = (w_auth || 0.34).to_f
    end

    return [] if @checked_book_ids.empty?

    # Calculate raw scores per candidate book
    content_scores = compute_content_scores
    collab_scores = compute_collab_scores
    auth_scores = compute_authority_scores

    # Gather all candidate book IDs
    candidate_ids = (content_scores.keys + collab_scores.keys + auth_scores.keys).uniq - @checked_book_ids.to_a
    return [] if candidate_ids.empty?

    # Max normalization
    max_content = content_scores.values.max.to_f
    max_collab = collab_scores.values.max.to_f
    max_auth = auth_scores.values.max.to_f

    max_content = 1.0 if max_content.zero?
    max_collab = 1.0 if max_collab.zero?
    max_auth = 1.0 if max_auth.zero?

    # Combine scores
    scored_candidates = candidate_ids.map do |bid|
      c_raw = content_scores[bid] || 0.0
      l_raw = collab_scores[bid] || 0.0
      a_raw = auth_scores[bid] || 0.0

      c_norm = c_raw / max_content
      l_norm = l_raw / max_collab
      a_norm = a_raw / max_auth

      final_score = (w_content * c_norm) + (w_collab * l_norm) + (w_auth * a_norm)

      sources = []
      sources << "content" if c_raw > 0
      sources << "collaborative" if l_raw > 0
      sources << "authority" if a_raw > 0

      primary_source = case sources.length
                       when 3 then "all"
                       when 2 then "multiple"
                       when 1 then sources.first
                       else "content"
                       end

      {
        book_id: bid,
        score: final_score.round(4),
        raw_scores: {
          content: c_raw.round(4),
          collaborative: l_raw.round(4),
          authority: a_raw.round(4)
        },
        normalized_scores: {
          content: c_norm.round(4),
          collaborative: l_norm.round(4),
          authority: a_norm.round(4)
        },
        primary_source: primary_source,
        sources: sources
      }
    end

    scored_candidates.sort_by! { |c| -c[:score] }
    top_candidates = scored_candidates.first(limit)

    # Hydrate book details
    books_by_id = Book.where(id: top_candidates.map { |c| c[:book_id] }).index_by(&:id)

    top_candidates.map do |item|
      b = books_by_id[item[:book_id]]
      next unless b

      explanation = build_explanation(item, b)

      {
        book_id: b.id,
        title: b.title,
        description: b.description || "",
        author: b.author,
        score: item[:score],
        match_percentage: (item[:score] * 100).round,
        primary_source: item[:primary_source],
        sources: item[:sources],
        raw_scores: item[:raw_scores],
        explanation: explanation
      }
    end.compact
  end

  private

  def compute_content_scores
    scores = Hash.new(0.0)
    sims = ContentSimilarity.where(book_id: @checked_book_ids)
                            .where.not(similar_book_id: @checked_book_ids)

    sims.each do |sim|
      scores[sim.similar_book_id] += sim.similarity
    end
    scores
  end

  def compute_collab_scores
    scores = Hash.new(0.0)

    # Find users who share checkouts
    other_user_checkouts = Checkout.where.not(patron_id: @patron.id)
                                   .pluck(:patron_id, :book_id)

    user_books_map = Hash.new { |h, k| h[k] = Set.new }
    other_user_checkouts.each do |pid, bid|
      user_books_map[pid] << bid.to_s
    end

    user_books_map.each do |other_pid, other_bids|
      intersection = (@checked_book_ids & other_bids).size
      next if intersection.zero?

      union = (@checked_book_ids | other_bids).size
      jaccard = intersection.to_f / union

      (other_bids - @checked_book_ids).each do |bid|
        scores[bid] += jaccard
      end
    end

    scores
  end

  def compute_authority_scores
    scores = Hash.new(0.0)

    connections = BookConnection.where(source_book_id: @checked_book_ids)
                                .where.not(target_book_id: @checked_book_ids)

    connections.each do |conn|
      scores[conn.target_book_id] += conn.weight
    end

    # Also reverse direction
    rev_connections = BookConnection.where(target_book_id: @checked_book_ids)
                                     .where.not(source_book_id: @checked_book_ids)
    rev_connections.each do |conn|
      scores[conn.source_book_id] += conn.weight
    end

    scores
  end

  def build_explanation(item, book)
    reasons = []

    if item[:raw_scores][:content] > 0
      reasons << "Presenta similitud temática con lecturas anteriores en tu historial."
    end

    if item[:raw_scores][:collaborative] > 0
      reasons << "Ha sido leído por lectores con hábitos y gustos de lectura afines a los tuyos."
    end

    if item[:raw_scores][:authority] > 0
      auth_count = book.authorities.count
      reasons << "Comparte #{auth_count} descriptores y autoridades catalográficas con tu acervo."
    end

    reasons.join(" ")
  end
end
