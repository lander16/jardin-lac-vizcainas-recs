# frozen_string_literal: true

class RecommendationService
  DEFAULT_WEIGHTS = [ 0.33, 0.33, 0.34 ].freeze

  def self.normalize_weights(w_content: nil, w_collab: nil, w_auth: nil, alpha: nil)
    wc = w_content.presence
    wl = w_collab.presence
    wa = w_auth.presence
    al = alpha.presence

    weights = if wc.nil? && wl.nil? && wa.nil?
                if al.nil?
                  DEFAULT_WEIGHTS
                else
                  a = numeric_weight(al).clamp(0.0, 1.0)
                  [ a, 1.0 - a, 0.0 ]
                end
    else
                [ wc, wl, wa ].map { |weight| numeric_weight(weight).clamp(0.0, 1.0) }
    end

    total = weights.sum
    weights = DEFAULT_WEIGHTS if total.zero?
    total = weights.sum

    weights.map { |weight| weight / total }
  end

  def self.numeric_weight(value)
    Float(value || 0)
  rescue ArgumentError, TypeError
    0.0
  end

  def initialize(patron)
    @patron = patron
    @checked_book_ids = patron.checkouts.distinct.pluck(:book_id).map(&:to_s).to_set
  end

  def recommend(w_content: nil, w_collab: nil, w_auth: nil, alpha: nil, limit: 30)
    w_content, w_collab, w_auth = self.class.normalize_weights(
      w_content: w_content,
      w_collab: w_collab,
      w_auth: w_auth,
      alpha: alpha
    )
    limit = (limit || 30).to_i.clamp(1, 100)

    return [] if @checked_book_ids.empty?

    content_scores = w_content > 0.0 ? compute_content_scores : {}
    collab_scores = w_collab > 0.0 ? compute_collab_scores : {}
    auth_scores = w_auth > 0.0 ? compute_authority_scores : {}

    candidate_ids = (content_scores.keys + collab_scores.keys + auth_scores.keys).uniq - @checked_book_ids.to_a
    return [] if candidate_ids.empty?

    max_content = content_scores.values.max.to_f
    max_collab = collab_scores.values.max.to_f
    max_auth = auth_scores.values.max.to_f

    max_content = 1.0 if max_content.zero?
    max_collab = 1.0 if max_collab.zero?
    max_auth = 1.0 if max_auth.zero?

    active_weight = 0.0
    active_weight += w_content if w_content > 0.0 && content_scores.any?
    active_weight += w_collab if w_collab > 0.0 && collab_scores.any?
    active_weight += w_auth if w_auth > 0.0 && auth_scores.any?
    return [] if active_weight <= 0.0

    scored_candidates = candidate_ids.filter_map do |bid|
      c_raw = content_scores[bid] || 0.0
      l_raw = collab_scores[bid] || 0.0
      a_raw = auth_scores[bid] || 0.0

      c_norm = c_raw / max_content
      l_norm = l_raw / max_collab
      a_norm = a_raw / max_auth

      final_score = ((w_content * c_norm) + (w_collab * l_norm) + (w_auth * a_norm)) / active_weight
      next if final_score <= 0.0

      sources = []
      sources << "content" if w_content > 0.0 && c_raw > 0.0
      sources << "collaborative" if w_collab > 0.0 && l_raw > 0.0
      sources << "authority" if w_auth > 0.0 && a_raw > 0.0

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

    scored_candidates.sort_by! { |c| [ -c[:score], c[:book_id].to_s ] }
    top_candidates = diversify_by_author(scored_candidates, limit)
    return [] if top_candidates.empty?

    candidate_book_ids = top_candidates.map { |c| c[:book_id] }
    books_by_id = Book.select(:id, :title, :author, :description)
                      .includes(:authorities)
                      .where(id: candidate_book_ids)
                      .index_by(&:id)
    closest_read_books = batch_closest_read_books(candidate_book_ids)

    top_candidates.filter_map do |item|
      b = books_by_id[item[:book_id]]
      next unless b

      explanation = build_explanation(item, b, closest_books: closest_read_books)

      {
        book_id: b.id,
        title: b.title,
        description: b.description || "",
        author: b.author,
        score: item[:score],
        match_percentage: (item[:score] * 100).round.clamp(0, 100),
        primary_source: item[:primary_source],
        sources: item[:sources],
        raw_scores: item[:raw_scores],
        explanation: explanation
      }
    end
  end

  private

  def compute_content_scores
    checked = @checked_book_ids.to_a
    pair_scores = {}

    ContentSimilarity.where(book_id: checked)
                     .or(ContentSimilarity.where(similar_book_id: checked))
                     .pluck(:book_id, :similar_book_id, :similarity)
                     .each do |b_id, sb_id, sim|
      val = [ sim.to_f, 0.0 ].max
      next if val <= 0.0

      key = resolve_read_and_candidate(b_id, sb_id)
      next unless key

      pair_scores[key] = val if val > (pair_scores[key] || 0.0)
    end

    scores = Hash.new(0.0)
    pair_scores.each do |(_read_id, cand_id), val|
      scores[cand_id] += val
    end
    scores
  end

  def compute_collab_scores
    scores = Hash.new(0.0)

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
                              .distinct
                              .pluck(:patron_id, :book_id)

    other_checkouts.each do |pid, bid|
      j = jaccard_by_patron[pid]
      next if j.nil?

      scores[bid.to_s] += j
    end

    scores
  end

  def compute_authority_scores
    checked = @checked_book_ids.to_a
    scores = Hash.new(0.0)

    BookConnection.where(source_book_id: checked)
                  .where.not(target_book_id: checked)
                  .group(:target_book_id)
                  .sum(:weight)
                  .each { |book_id, total| scores[book_id.to_s] += total.to_f }

    BookConnection.where(target_book_id: checked)
                  .where.not(source_book_id: checked)
                  .group(:source_book_id)
                  .sum(:weight)
                  .each { |book_id, total| scores[book_id.to_s] += total.to_f }

    scores
  end

  def build_explanation(item, book, closest_books: nil)
    reasons = []
    active_sources = item[:sources]

    if active_sources.include?("content")
      closest_book = closest_books ? closest_books[book.id.to_s] : closest_read_book_for(book.id)
      if closest_book
        reasons << "Presenta similitud temática con una lectura anterior: #{closest_book.title}."
      else
        reasons << "Presenta similitud temática con lecturas anteriores en tu historial."
      end
    end

    if active_sources.include?("collaborative")
      reasons << "Ha sido leído por lectores con hábitos y gustos de lectura afines a los tuyos."
    end

    if active_sources.include?("authority")
      shared_names = shared_authority_names(book)
      if shared_names.any?
        reasons << "Comparte autoridades catalográficas con tus lecturas: #{shared_names.join(', ')}."
      else
        reasons << "Tiene descriptores y autoridades catalográficas relacionados con tu acervo."
      end
    end

    reasons.join(" ")
  end

  def batch_closest_read_books(candidate_ids)
    return {} if candidate_ids.empty? || @checked_book_ids.empty?

    checked = @checked_book_ids.to_a
    best_by_candidate = {}

    ContentSimilarity.where(book_id: checked, similar_book_id: candidate_ids)
                     .or(ContentSimilarity.where(similar_book_id: checked, book_id: candidate_ids))
                     .pluck(:book_id, :similar_book_id, :similarity)
                     .each do |b_id, sb_id, sim|
      read_id, cand_id = resolve_read_and_candidate(b_id, sb_id)
      next unless read_id

      best = best_by_candidate[cand_id]
      best_by_candidate[cand_id] = [ read_id, sim ] if best.nil? || sim > best[1]
    end

    read_book_ids = best_by_candidate.values.map(&:first).uniq
    read_books_by_id = Book.select(:id, :title).where(id: read_book_ids).index_by { |b| b.id.to_s }

    best_by_candidate.transform_values { |(read_id, _sim)| read_books_by_id[read_id] }
  end

  def resolve_read_and_candidate(book_id, similar_book_id)
    b_str = book_id.to_s
    sb_str = similar_book_id.to_s
    if @checked_book_ids.include?(b_str) && !@checked_book_ids.include?(sb_str)
      [ b_str, sb_str ]
    elsif @checked_book_ids.include?(sb_str) && !@checked_book_ids.include?(b_str)
      [ sb_str, b_str ]
    end
  end

  def closest_read_book_for(candidate_book_id)
    batch_closest_read_books([ candidate_book_id ])[candidate_book_id.to_s]
  end

  def patron_authority_ids
    @patron_authority_ids ||= BookAuthority.where(book_id: @checked_book_ids).distinct.pluck(:authority_id).to_set
  end

  def shared_authority_names(book)
    return [] if patron_authority_ids.empty?

    book.authorities
        .select { |a| patron_authority_ids.include?(a.id) }
        .sort_by(&:books_count)
        .first(3)
        .map(&:name)
  end

  def diversify_by_author(scored_candidates, limit)
    pool = scored_candidates.first(limit * 3)
    candidate_ids = pool.map { |candidate| candidate[:book_id] }
    authors_by_id = Book.where(id: candidate_ids).pluck(:id, :author).each_with_object({}) do |(id, author), map|
      norm = FuzzyText.normalize_text(author)
      map[id] = norm unless norm.empty?
    end

    selected = []
    author_counts = Hash.new(0)

    until pool.empty? || selected.length >= limit
      best_idx = pool.each_index.max_by do |idx|
        candidate = pool[idx]
        author = authors_by_id[candidate[:book_id]]
        penalty = author ? (author_counts[author] * 0.03) : 0.0
        candidate[:score] - penalty
      end

      best = pool.delete_at(best_idx)
      selected << best
      author = authors_by_id[best[:book_id]]
      author_counts[author] += 1 if author
    end

    selected
  end
end
