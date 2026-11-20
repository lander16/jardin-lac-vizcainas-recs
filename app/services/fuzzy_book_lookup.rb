# frozen_string_literal: true

require "set"

# Disk-backed fuzzy candidate lookup over SQLite's FTS5 trigram tokenizer.
module FuzzyBookLookup
  MAX_RESULTS_PER_TOKEN = 500
  MIN_TOKEN_LENGTH = 3
  MIN_TRANSPOSITION_TOKEN_LENGTH = 4
  MAX_TRANSPOSITION_WORDS_PER_TOKEN = 500
  MAX_TRANSPOSITION_IDS_PER_TOKEN = 100
  INSERT_BATCH_SIZE = 1000

  MATCH_SQL = "SELECT book_id FROM book_words_fts WHERE book_words_fts MATCH ? LIMIT #{MAX_RESULTS_PER_TOKEN}"
  private_constant :MATCH_SQL

  module_function

  def candidate_ids_for_tokens(query_tokens)
    book_ids = Set.new
    (query_tokens || []).each do |token|
      candidate_ids_for_token(token).each { |book_id| book_ids << book_id }
    end
    book_ids.to_a
  end

  def transposition_candidate_ids_for_tokens(query_tokens)
    book_ids = Set.new
    (query_tokens || []).each do |token|
      transposition_candidate_ids_for_token(token).each { |book_id| book_ids << book_id }
    end
    book_ids.to_a
  end

  def transposition_candidate_ids_for_token(token)
    token = escape_fts_query(token)
    return [] if token.length < MIN_TRANSPOSITION_TOKEN_LENGTH

    words = candidate_words_for_transposition(token)
    matching_words = words.select do |word|
      (word.length - token.length).abs <= 2 && FuzzyText.bounded_damerau_levenshtein(token, word, 2) <= 2
    end
    return [] if matching_words.empty?

    BookWord.where(word: matching_words)
            .distinct
            .limit(MAX_TRANSPOSITION_IDS_PER_TOKEN)
            .pluck(:book_id)
  rescue ActiveRecord::StatementInvalid => e
    Rails.logger&.debug("FuzzyBookLookup transposition lookup failed: #{e.class}: #{e.message}")
    []
  end

  def candidate_ids_for_token(token)
    escaped = escape_fts_query(token)
    return [] if escaped.length < MIN_TOKEN_LENGTH

    # Quote the normalized token so FTS5 operators (NOT, AND, OR, NEAR) are matched literally.
    ActiveRecord::Base.connection.select_values(MATCH_SQL, nil, [ "\"#{escaped}\"" ])
  rescue ActiveRecord::StatementInvalid => e
    Rails.logger&.debug("FuzzyBookLookup FTS5 lookup failed: #{e.class}: #{e.message}")
    []
  end

  def escape_fts_query(token)
    FuzzyText.normalize_text(token).gsub(/[^a-z0-9]/, "")
  end

  def candidate_words_for_transposition(token)
    token = escape_fts_query(token)
    return [] if token.length < MIN_TRANSPOSITION_TOKEN_LENGTH

    first_char = token[0]
    # Use UTF-8 codepoint successor instead of String#next because "9".next ("10")
    # and "z".next ("aa") sort before "9" and "z" in binary collation.
    upper_bound = (first_char.ord + 1).chr(Encoding::UTF_8)

    scope = BookWord.select(:word).distinct
                    .where("word >= ? AND word < ?", first_char, upper_bound)
                    .where("LENGTH(word) BETWEEN ? AND ?", token.length - 2, token.length + 2)

    trigrams = FuzzyText.trigrams_of(token)
    if trigrams.any?
      trigram_conditions = trigrams.map { "word LIKE ?" }.join(" OR ")
      trigram_binds = trigrams.map { |tri| "%#{ActiveRecord::Base.sanitize_sql_like(tri)}%" }
      scope = scope.where(trigram_conditions, *trigram_binds)
    end

    scope.limit(MAX_TRANSPOSITION_WORDS_PER_TOKEN).pluck(:word)
  end

  def trigrams_of(text)
    FuzzyText.trigrams_of(text)
  end

  def bounded_damerau_levenshtein(str1, str2, max_distance)
    FuzzyText.bounded_damerau_levenshtein(str1, str2, max_distance)
  end

  def rebuild_from_book_words!
    connection = ActiveRecord::Base.connection
    connection.execute("DELETE FROM book_words_fts")

    BookWord.distinct.pluck(:book_id, :word).each_slice(INSERT_BATCH_SIZE) do |batch|
      placeholders = Array.new(batch.size, "(?, ?)").join(",")
      binds = batch.flat_map { |book_id, word| [ word, book_id ] }
      sql = ActiveRecord::Base.sanitize_sql_array(
        [ "INSERT INTO book_words_fts(word, book_id) VALUES #{placeholders}", *binds ]
      )
      connection.execute(sql)
    end
  end
end
