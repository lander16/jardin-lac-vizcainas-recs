# frozen_string_literal: true

require "set"

# SymSpell (symmetric-delete spelling correction) index for fuzzy
# search. Pre-computes "delete variants" of every word in the
# dictionary and at query time intersects the query's delete variants
# against the index, verifying each candidate with Levenshtein. Handles
# typos up to max_edit_distance (default 2) at query time,
# language-agnostic.
#
# Words are normalized through FuzzyText.normalize_word — the same
# tokenizer used by import_book_words.rake — so the index and the data
# side agree: lowercase, diacritics stripped, [a-z0-9] only, and tokens
# shorter than 3 chars dropped. Records whose word normalizes to nil
# are skipped entirely.
#
# Usage:
#   SymSpellIndex.from_records([
#     { word: "hemingway",   book_id: "b1", source: "author" },
#     { word: "shakespeare", book_id: "b2", source: "author" },
#   ])
#   index.lookup("hemway")  # => []  (edit distance 3 > max 2)
#
# The class is a pure data structure and does not need a database
# connection. Loading from the DB is a separate class method
# (SymSpellIndex.default / .from_database!), used by the search
# service integration.
class SymSpellIndex
  attr_reader :max_edit_distance

  class << self
    # Memoized process-wide index, built lazily from BookWord on first
    # call. Tests stub this method to inject a fake index.
    def default
      @default ||= from_database!
    end

    # Re-build from the current BookWord table. Words are already
    # normalized by the import task; normalizing again is idempotent.
    def from_database!
      rows = BookWord.pluck(:word, :book_id, :source).map do |word, book_id, source|
        { word: word, book_id: book_id, source: source }
      end
      from_records(rows)
    end

    # Clear the memoized instance. Test helper.
    def reset!
      @default = nil
    end

    # Bulk-build from an enumerable of { word:, book_id:, source: }
    # hashes. Faster than a loop of add_word calls because delete
    # variants are generated once per unique word, after all words have
    # been collected (duplicated words are only normalized once for the
    # delete phase).
    def from_records(records)
      index = new
      records.each do |r|
        index.send(:store_word, r[:word], r[:book_id], r[:source])
      end
      index.send(:build_deletes)
      index
    end
  end

  def initialize(max_edit_distance: 2)
    @max_edit_distance = max_edit_distance
    @words = {}                 # normalized word => { book_ids: Set, source: String }
    @frequencies = Hash.new(0)  # normalized word => count of distinct book_ids
    # Delete variant => word(s) that produced it. Most variants come
    # from a single dictionary word, so a bare String is stored; a
    # collision upgrades the entry to an Array. Per-word corpus
    # frequencies are kept separately in @frequencies (see #frequency),
    # which avoids a nested Hash per delete variant and keeps the index
    # small enough to hold in memory.
    @deletes = {}
    @one_delete_keys = Set.new  # every 1-deletion of every dictionary word
  end

  # Insert one word occurrence. Idempotent per (word, book_id): adding
  # the same pair twice does not change the index. Delete variants for
  # the word are generated immediately so the index stays usable when
  # built incrementally. Returns true if a new pair was stored, false
  # otherwise.
  def add_word(word, book_id, source: nil)
    key = store_word(word, book_id, source)
    return false if key.nil?

    register_one_deletes(key)
    generate_deletes_for(key)
    true
  end

  # Returns an Array of [book_id, matched_word] pairs for every word in
  # the index whose edit distance to the (normalized) query is <=
  # max_edit_distance. matched_word is the dictionary word that matched
  # (useful for highlighting), not the query. Returns [] for input that
  # normalizes to nil or to a token shorter than 3 chars.
  def lookup(query)
    q = normalize(query)
    return [] if q.nil?

    results = Hash.new { |h, k| h[k] = Set.new } # book_id => Set<matched_word>

    # Distance 0 — exact dictionary hit.
    if (entry = @words[q])
      entry[:book_ids].each { |bid| results[bid] << q }
    end

    # The query itself may be a 1- or 2-deletion of a dictionary word
    # (e.g. "hemingwy" is a 1-deletion of "hemingway"), so it has to be
    # probed against the delete index too.
    probe_delete_key(q, q, results)

    # Distance 1 — every 1-deletion of the query.
    if @max_edit_distance >= 1
      edits1(q).each { |edit| probe_delete_key(q, edit, results) }
    end

    # Distance 2 — every 2-deletion of the query. The real edit
    # distance is verified later, because two separate 1-deletions can
    # combine to be farther from the query than 2.
    if @max_edit_distance >= 2
      seen_keys = Set.new
      edits1(q).each do |edit1|
        edits1(edit1).each do |edit2|
          next if seen_keys.include?(edit2)

          seen_keys << edit2
          probe_delete_key(q, edit2, results)
        end
      end
    end

    results.flat_map { |bid, words| words.map { |word| [ bid, word ] } }
  end

  def size
    @words.size
  end

  # Number of distinct book_ids the normalized word appears in (0 if it
  # is not in the index). Used for ranking/preference at query time.
  def frequency(word)
    @frequencies[normalize(word)]
  end

  private

  # Normalizes through FuzzyText.normalize_word so the index agrees
  # with the data side. Words already in normalized form (lowercase
  # [a-z0-9], >= 3 chars — which is what import_book_words.rake
  # produces) skip the transliterate/gsub pipeline entirely; the fast
  # path is a pure performance win with identical results.
  def normalize(word)
    s = word.to_s
    return s if s.match?(/\A[a-z0-9]{3,}\z/)

    FuzzyText.normalize_word(s)
  end

  # Stores one occurrence and returns the normalized word only when the
  # (word, book_id) pair is new. Normalization happens here so
  # "García!" and "garcia" collapse to a single entry, matching the
  # data side.
  def store_word(word, book_id, source)
    return nil if book_id.nil?

    key = normalize(word)
    return nil if key.nil?

    entry = (@words[key] ||= { book_ids: Set.new, source: source })
    return nil unless entry[:book_ids].add?(book_id)

    @frequencies[key] += 1
    key
  end

  # Generates the delete variants for one word and populates @deletes.
  # Called once per unique word (from build_deletes) or on every new
  # pair (from add_word).
  def generate_deletes_for(word)
    one_deletes = @one_deletes_cache ? @one_deletes_cache[word] : edits1(word)
    one_deletes.each { |edit| add_delete(edit, word) }
    return unless @max_edit_distance >= 2

    two_deletes(word).each { |edit| add_delete(edit, word) }
  end

  # Records `word` as a producer of the delete variant `edit`, keeping
  # the entry as a bare String when it has a single producer and only
  # upgrading to an Array when a second word collides.
  def add_delete(edit, word)
    existing = @deletes[edit]
    case existing
    when nil then @deletes[edit] = word
    when String
      @deletes[edit] = [ existing, word ] unless existing == word
    when Array
      existing << word unless existing.include?(word)
    end
  end

  # All 2-deletions of `word`, generated from pairs of character
  # positions (deleting positions i,j in either order yields the same
  # string, so each 2-deletion is built exactly once — equivalent to,
  # but half the work of, generating them from the word's 1-deletions).
  # Per the SymSpell paper, a 2-deletion that is also a 1-deletion of
  # some OTHER dictionary word is excluded: the query path still
  # reaches that other word through its own 1-deletions, so recall is
  # preserved while the delete index stays compact.
  def two_deletes(word)
    result = Set.new
    len = word.length
    (0...len).each do |i|
      (i + 1...len).each do |j|
        edit2 = word[0...i] + word[(i + 1)...j] + word[(j + 1)..]
        next if @one_delete_keys.include?(edit2)

        result << edit2
      end
    end
    result
  end

  def register_one_deletes(word)
    edits1(word).each { |edit| @one_delete_keys << edit }
  end

  def build_deletes
    @one_delete_keys = Set.new
    # Collect every 1-deletion once per word so the exclusion rule sees
    # the complete set and the strings are shared with @deletes (no
    # duplicate 1-delete objects).
    @one_deletes_cache = {}
    @words.each_key do |word|
      one_deletes = edits1(word)
      @one_deletes_cache[word] = one_deletes
      one_deletes.each { |edit| @one_delete_keys << edit }
    end
    @words.each_key { |word| generate_deletes_for(word) }
  ensure
    @one_deletes_cache = nil
  end

  # Looks `key` up in @deletes and records every candidate word within
  # max_edit_distance of `query` as a match.
  def probe_delete_key(query, key, results)
    candidates = @deletes[key]
    return if candidates.nil?

    if candidates.is_a?(Array)
      candidates.each { |word| check_candidate(query, word, results) }
    else
      check_candidate(query, candidates, results)
    end
  end

  def check_candidate(query, word, results)
    return unless @words.key?(word)
    return if word == query

    dist = levenshtein_bounded(query, word, @max_edit_distance)
    return if dist > @max_edit_distance

    @words[word][:book_ids].each { |bid| results[bid] << word }
  end

  # All unique single-character deletions of `word`.
  def edits1(word)
    len = word.length
    result = Array.new(len)
    (0...len).each do |i|
      result[i] = word[0...i] + word[(i + 1)..]
    end
    result.uniq
  end

  # Levenshtein distance with early termination once a row's minimum
  # exceeds max_dist (the final distance then cannot be <= max_dist).
  # Memory-bounded to two rows. Returns max_dist + 1 when the distance
  # is out of range.
  def levenshtein_bounded(s1, s2, max_dist)
    return s2.length if s1.empty?
    return s1.length if s2.empty?

    # Keep s1 as the shorter string so the row arrays stay small.
    s1, s2 = s2, s1 if s1.length > s2.length

    prev = (0..s2.length).to_a
    curr = Array.new(s2.length + 1, 0)

    (1..s1.length).each do |i|
      curr[0] = i
      row_min = i
      (1..s2.length).each do |j|
        cost = s1[i - 1] == s2[j - 1] ? 0 : 1
        m = [ prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost ].min
        curr[j] = m
        row_min = m if m < row_min
      end
      return max_dist + 1 if row_min > max_dist

      prev, curr = curr, prev
    end

    prev[s2.length]
  end
end
