class RecommendationService
  def initialize(patron)
    @patron = patron
    @checked_book_ids = patron.checkouts.pluck(:book_id).map(&:to_s).to_set
  end

  def recommend(w_content: nil, w_collab: nil, w_auth: nil, alpha: nil, limit: 30)
    w_content, w_collab, w_auth = normalize_weights(w_content, w_collab, w_auth, alpha)

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
    scored_candidates = diversify_by_author(scored_candidates, limit)
    top_candidates = scored_candidates.first(limit)

    # Hydrate book details (preload authorities to avoid N+1 on book.authorities.count
    # in build_explanation below).
    books_by_id = Book.includes(:authorities)
                      .where(id: top_candidates.map { |c| c[:book_id] })
                      .index_by(&:id)

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

  DEFAULT_WEIGHTS = [ 0.33, 0.33, 0.34 ].freeze

  def normalize_weights(w_content, w_collab, w_auth, alpha)
    weights = if w_content.nil? && w_collab.nil? && w_auth.nil?
      if alpha.nil?
        DEFAULT_WEIGHTS
      else
        a = numeric_weight(alpha).clamp(0.0, 1.0)
        [ a, 1.0 - a, 0.0 ]
      end
    else
      [ w_content, w_collab, w_auth ].map { |weight| numeric_weight(weight).clamp(0.0, 1.0) }
    end

    total = weights.sum
    weights = DEFAULT_WEIGHTS if total.zero?
    total = weights.sum

    weights.map { |weight| weight / total }
  end

  def numeric_weight(value)
    Float(value || 0)
  rescue ArgumentError, TypeError
    0.0
  end

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

    # Use the precomputed user_similarities table instead of re-computing
    # Jaccard over every checkout row in the system per request.
    similar = UserSimilarity.where(patron_id: @patron.id)
                            .where.not(similar_patron_id: @patron.id)
                            .order(jaccard_score: :desc)
                            .limit(50)
                            .pluck(:similar_patron_id, :jaccard_score)

    return scores if similar.empty?

    jaccard_by_patron = similar.to_h
    similar_patron_ids = jaccard_by_patron.keys

    other_checkouts = Checkout.where(patron_id: similar_patron_ids)
                              .where.not(book_id: @checked_book_ids.to_a)
                              .pluck(:patron_id, :book_id)

    other_checkouts.each do |pid, bid|
      j = jaccard_by_patron[pid]
      next if j.nil?
      scores[bid.to_s] += j
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
      closest_book = closest_read_book_for(book.id)
      if closest_book
        reasons << "Presenta similitud temática con una lectura anterior: #{closest_book.title}."
      else
        reasons << "Presenta similitud temática con lecturas anteriores en tu historial."
      end
    end

    if item[:raw_scores][:collaborative] > 0
      reasons << "Ha sido leído por lectores con hábitos y gustos de lectura afines a los tuyos."
    end

    if item[:raw_scores][:authority] > 0
      shared_names = shared_authority_names(book)
      if shared_names.any?
        reasons << "Comparte autoridades catalográficas con tus lecturas: #{shared_names.join(', ')}."
      else
        reasons << "Tiene descriptores y autoridades catalográficas relacionados con tu acervo."
      end
    end

    reasons.join(" ")
  end

  def closest_read_book_for(candidate_book_id)
    sim = ContentSimilarity.where(book_id: @checked_book_ids, similar_book_id: candidate_book_id)
                           .order(similarity: :desc)
                           .first
    Book.find_by(id: sim&.book_id)
  end

  def shared_authority_names(book)
    patron_authority_ids = BookAuthority.where(book_id: @checked_book_ids).distinct.pluck(:authority_id)
    return [] if patron_authority_ids.empty?

    book.authorities.where(id: patron_authority_ids).limit(3).pluck(:name)
  end

  def diversify_by_author(scored_candidates, limit)
    candidate_ids = scored_candidates.first(limit * 3).map { |candidate| candidate[:book_id] }
    authors_by_id = Book.where(id: candidate_ids).pluck(:id, :author).to_h
    remaining = scored_candidates.dup
    selected = []
    author_counts = Hash.new(0)

    until remaining.empty? || selected.length >= limit
      best = remaining.max_by do |candidate|
        author = authors_by_id[candidate[:book_id]].presence
        penalty = author ? (author_counts[author] * 0.03) : 0.0
        candidate[:score] - penalty
      end

      remaining.delete(best)
      selected << best
      author = authors_by_id[best[:book_id]].presence
      author_counts[author] += 1 if author
    end

    selected + remaining
  end
end
