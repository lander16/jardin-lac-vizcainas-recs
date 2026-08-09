# frozen_string_literal: true

require "set"

# Disk-backed fuzzy candidate lookup over SQLite's FTS5 trigram tokenizer.
#
# Replaces the in-memory SymSpellIndex, which cost ~300 MB of RSS on a
# dev box and pushed the 512 MB Render free tier over its limit. The FTS
# index lives inside the SQLite database file (page cache is the only
# Ruby-side cost, ~1-5 MB), so the fuzzy candidate layer no longer
# materializes a dictionary in the process.
#
# At import time (lib/tasks/import_book_words.rake) the normalized
# book_words rows are copied into the FTS5 virtual table book_words_fts.
# At query time each token is run through a single MATCH query. The
# trigram tokenizer indexes every 3-character sequence of each word and
# matches a row when every trigram of the query appears in the row, so a
# single MATCH catches typos that do not create a boundary trigram at the
# edit site (dropped first or last character: "akespeare" ->
# "shakespeare"). Typos that DO create a boundary trigram ("hemingwy",
# "pedrp") are covered by the trigram LIKE tiers in
# CatalogSearchService#candidate_books, which this source is OR'd with.
#
# Words in the FTS table are already normalized (lowercase, diacritics
# stripped, [a-z0-9], >= 3 chars) by FuzzyText via import_book_words.rake;
# query tokens are normalized the same way in the search path.
class FuzzyBookLookup
  MAX_RESULTS_PER_TOKEN = 500
  MIN_TOKEN_LENGTH = 3
  MIN_TRANSPOSITION_TOKEN_LENGTH = 4
  MAX_TRANSPOSITION_WORDS_PER_TOKEN = 500
  MAX_TRANSPOSITION_IDS_PER_TOKEN = 100
  INSERT_BATCH_SIZE = 1000

  MATCH_SQL = "SELECT book_id FROM book_words_fts WHERE book_words_fts MATCH ? LIMIT #{MAX_RESULTS_PER_TOKEN}"
  private_constant :MATCH_SQL

  class << self
    # Union of candidate book_ids across all query tokens. Empty and
    # too-short tokens are skipped by candidate_ids_for_token.
    def candidate_ids_for_tokens(query_tokens)
      book_ids = Set.new
      (query_tokens || []).each do |token|
        candidate_ids_for_token(token).each { |book_id| book_ids << book_id }
      end
      book_ids.to_a
    end

    # Bounded vocabulary fallback for pure/near transposition typos that
    # FTS5 trigram MATCH cannot bridge (e.g. "rulsfo" -> "rulfo"). It
    # intentionally runs after exact/prefix and FTS candidates in the
    # catalog service, with strict prefilters to avoid reintroducing broad
    # noisy caps for common terms.
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
        (word.length - token.length).abs <= 2 && bounded_damerau_levenshtein(token, word, 2) <= 2
      end
      return [] if matching_words.empty?

      BookWord.where(word: matching_words)
              .distinct
              .limit(MAX_TRANSPOSITION_IDS_PER_TOKEN)
              .pluck(:book_id)
    rescue ActiveRecord::StatementInvalid
      []
    end

    # Look up a single (already normalized) token in the FTS5 trigram
    # index, returning up to MAX_RESULTS_PER_TOKEN matching book_ids.
    def candidate_ids_for_token(token)
      escaped = escape_fts_query(token)
      return [] if escaped.length < MIN_TOKEN_LENGTH

      ActiveRecord::Base.connection.select_values(MATCH_SQL, nil, [ escaped ])
    rescue ActiveRecord::StatementInvalid
      # book_words_fts not created yet (migration not run) — fail open.
      []
    end

    # Replace FTS5 query operators with spaces so the query is treated as
    # literal trigrams rather than an FTS5 expression. Normalized tokens
    # are already [a-z0-9], so in the search path this is a no-op apart
    # from the strip; it only matters for direct callers.
    def escape_fts_query(token)
      token.to_s.gsub(/["*():\s]/, " ").strip
    end

    def candidate_words_for_transposition(token)
      first_char = ActiveRecord::Base.sanitize_sql_like(token[0])
      scope = BookWord.select(:word).distinct
                      .where("word LIKE ?", "#{first_char}%")
                      .where("LENGTH(word) BETWEEN ? AND ?", token.length - 2, token.length + 2)

      trigrams = trigrams_of(token)
      if trigrams.any?
        trigram_conditions = trigrams.map { "word LIKE ?" }.join(" OR ")
        trigram_binds = trigrams.map { |tri| "%#{ActiveRecord::Base.sanitize_sql_like(tri)}%" }
        scope = scope.where(trigram_conditions, *trigram_binds)
      end

      scope.limit(MAX_TRANSPOSITION_WORDS_PER_TOKEN).pluck(:word)
    end

    def trigrams_of(text)
      return [] if text.length < 3

      (0..text.length - 3).map { |i| text[i, 3] }.uniq
    end

    def bounded_damerau_levenshtein(str1, str2, max_distance)
      return max_distance + 1 if (str1.length - str2.length).abs > max_distance

      s1 = str1.chars
      s2 = str2.chars
      d = Array.new(s1.size + 1) { Array.new(s2.size + 1, 0) }

      (0..s1.size).each { |i| d[i][0] = i }
      (0..s2.size).each { |j| d[0][j] = j }

      (1..s1.size).each do |i|
        row_min = max_distance + 1
        (1..s2.size).each do |j|
          cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1
          d[i][j] = [ d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost ].min
          if i > 1 && j > 1 && s1[i - 1] == s2[j - 2] && s1[i - 2] == s2[j - 1]
            d[i][j] = [ d[i][j], d[i - 2][j - 2] + 1 ].min
          end
          row_min = [ row_min, d[i][j] ].min
        end
        return max_distance + 1 if row_min > max_distance
      end

      d[s1.size][s2.size]
    end

    # Truncate and repopulate book_words_fts from the book_words table.
    # Called by bin/rails import:book_words so the two structures stay in
    # sync. Bulk parameterized INSERTs (1000-row batches) keep this fast
    # for the ~194k rows on the dev DB.
    def rebuild_from_book_words!
      connection = ActiveRecord::Base.connection
      connection.execute("DELETE FROM book_words_fts")

      batch = []
      flush = lambda do
        return if batch.empty?

        placeholders = Array.new(batch.size, "(?, ?)").join(",")
        binds = batch.flat_map { |bw| [ bw.word, bw.book_id ] }
        # sanitize_sql_array quotes every bind value, so the multi-row
        # INSERT is built without interpolating raw values into SQL.
        sql = ActiveRecord::Base.sanitize_sql_array(
          [ "INSERT INTO book_words_fts(word, book_id) VALUES #{placeholders}", *binds ]
        )
        connection.execute(sql)
        batch.clear
      end

      BookWord.find_each do |bw|
        batch << bw
        flush.call if batch.size >= INSERT_BATCH_SIZE
      end
      flush.call
    end
  end
end
