# frozen_string_literal: true

# Shared text utilities used by catalog search, fuzzy lookup, and word
# normalization:
# - Word normalization for book_words and query tokens
# - Trigram extraction
# - Levenshtein and Damerau-Levenshtein distance calculations
module FuzzyText
  module_function

  # Lowercases, strips diacritics, keeps only [a-z0-9], and drops
  # tokens shorter than 3 chars. Returns nil when nothing survives.
  def normalize_word(raw)
    return nil if raw.blank?

    I18n.transliterate(raw.to_s.downcase)
        .gsub(/[^a-z0-9]/, "")
        .then { |w| w.length >= 3 ? w : nil }
  end

  # Splits a string into normalized words >= 3 chars, deduped, order preserved.
  def normalize_words(raw)
    return [] if raw.blank?

    raw.to_s.split(/\s+/).filter_map { |w| normalize_word(w) }.uniq
  end

  # Returns unique 3-character substrings of text in order.
  # Returns an empty array if text has fewer than 3 characters.
  def trigrams_of(text)
    return [] if text.nil? || text.length < 3

    (0..text.length - 3).map { |i| text[i, 3] }.uniq
  end

  # Computes standard Levenshtein edit distance between str1 and str2.
  def levenshtein_distance(str1, str2)
    s1 = str1.to_s.chars
    s2 = str2.to_s.chars
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

  # Computes Damerau-Levenshtein distance (full matrix calculation)
  # including adjacent transpositions as a single edit operation.
  def damerau_levenshtein_distance(str1, str2)
    s1 = str1.to_s.chars
    s2 = str2.to_s.chars
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
        if i > 1 && j > 1 && s1[i - 1] == s2[j - 2] && s1[i - 2] == s2[j - 1]
          d[i][j] = [ d[i][j], d[i - 2][j - 2] + 1 ].min
        end
      end
    end

    d[s1.size][s2.size]
  end

  # Computes Damerau-Levenshtein distance with early-exit thresholding.
  # Returns distance if <= max_distance, otherwise returns max_distance + 1.
  def bounded_damerau_levenshtein(str1, str2, max_distance)
    s1 = str1.to_s
    s2 = str2.to_s

    return 0 if s1 == s2
    return max_distance + 1 if (s1.length - s2.length).abs > max_distance
    return s2.length if s1.empty?
    return s1.length if s2.empty?

    chars1 = s1.chars
    chars2 = s2.chars
    d = Array.new(chars1.size + 1) { Array.new(chars2.size + 1, 0) }

    (0..chars1.size).each { |i| d[i][0] = i }
    (0..chars2.size).each { |j| d[0][j] = j }

    (1..chars1.size).each do |i|
      row_min = max_distance + 1
      (1..chars2.size).each do |j|
        cost = (chars1[i - 1] == chars2[j - 1]) ? 0 : 1
        d[i][j] = [ d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost ].min
        if i > 1 && j > 1 && chars1[i - 1] == chars2[j - 2] && chars1[i - 2] == chars2[j - 1]
          d[i][j] = [ d[i][j], d[i - 2][j - 2] + 1 ].min
        end
        row_min = [ row_min, d[i][j] ].min
      end
      return max_distance + 1 if row_min > max_distance
    end

    d[chars1.size][chars2.size]
  end
end
