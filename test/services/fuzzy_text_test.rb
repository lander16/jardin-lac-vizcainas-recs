# frozen_string_literal: true

require "test_helper"

class FuzzyTextTest < ActiveSupport::TestCase
  # normalize_word
  test "normalize_word handles blank and nil input" do
    assert_nil FuzzyText.normalize_word(nil)
    assert_nil FuzzyText.normalize_word("")
    assert_nil FuzzyText.normalize_word("   ")
  end

  test "normalize_word lowercases, strips accents, and removes non-alphanumeric chars" do
    assert_equal "garcia", FuzzyText.normalize_word("García")
    assert_equal "cancion", FuzzyText.normalize_word("canción!")
    assert_equal "donquijote", FuzzyText.normalize_word("Don-Quijote")
  end

  test "normalize_word returns nil for tokens shorter than 3 characters" do
    assert_nil FuzzyText.normalize_word("el")
    assert_nil FuzzyText.normalize_word("de")
    assert_nil FuzzyText.normalize_word("a")
    assert_nil FuzzyText.normalize_word("12")
    assert_equal "sol", FuzzyText.normalize_word("Sol")
  end

  # normalize_words
  test "normalize_words handles blank and nil input" do
    assert_equal [], FuzzyText.normalize_words(nil)
    assert_equal [], FuzzyText.normalize_words("")
    assert_equal [], FuzzyText.normalize_words("   ")
  end

  test "normalize_words splits, filters short tokens, and deduplicates while preserving order" do
    input = "El ingenioso hidalgo Don Quijote de la Mancha Don Quijote"
    expected = [ "ingenioso", "hidalgo", "don", "quijote", "mancha" ]
    assert_equal expected, FuzzyText.normalize_words(input)
  end

  # trigrams_of
  test "trigrams_of returns empty array for strings shorter than 3 characters or blank" do
    assert_equal [], FuzzyText.trigrams_of(nil)
    assert_equal [], FuzzyText.trigrams_of("")
    assert_equal [], FuzzyText.trigrams_of("a")
    assert_equal [], FuzzyText.trigrams_of("ab")
  end

  test "trigrams_of returns unique 3-character substrings preserving order" do
    assert_equal [ "abc" ], FuzzyText.trigrams_of("abc")
    assert_equal [ "sha", "hak", "ake", "kes", "esp", "spe", "pea", "ear", "are" ],
                 FuzzyText.trigrams_of("shakespeare")
    assert_equal [ "ban", "ana", "nan" ], FuzzyText.trigrams_of("banana")
  end

  # levenshtein_distance
  test "levenshtein_distance calculates correct edit distance" do
    assert_equal 0, FuzzyText.levenshtein_distance("test", "test")
    assert_equal 0, FuzzyText.levenshtein_distance("", "")
    assert_equal 3, FuzzyText.levenshtein_distance("abc", "")
    assert_equal 3, FuzzyText.levenshtein_distance("", "abc")
    assert_equal 1, FuzzyText.levenshtein_distance("cat", "cats")
    assert_equal 1, FuzzyText.levenshtein_distance("cats", "cat")
    assert_equal 1, FuzzyText.levenshtein_distance("cat", "hat")
    assert_equal 3, FuzzyText.levenshtein_distance("kitten", "sitting")
  end

  test "levenshtein_distance treats transposition as two operations" do
    assert_equal 2, FuzzyText.levenshtein_distance("ab", "ba")
    assert_equal 2, FuzzyText.levenshtein_distance("cafer", "cafre")
  end

  # damerau_levenshtein_distance
  test "damerau_levenshtein_distance calculates correct edit distance" do
    assert_equal 0, FuzzyText.damerau_levenshtein_distance("test", "test")
    assert_equal 0, FuzzyText.damerau_levenshtein_distance("", "")
    assert_equal 3, FuzzyText.damerau_levenshtein_distance("abc", "")
    assert_equal 3, FuzzyText.damerau_levenshtein_distance("", "abc")
    assert_equal 1, FuzzyText.damerau_levenshtein_distance("cat", "cats")
    assert_equal 1, FuzzyText.damerau_levenshtein_distance("cats", "cat")
    assert_equal 1, FuzzyText.damerau_levenshtein_distance("cat", "hat")
    assert_equal 3, FuzzyText.damerau_levenshtein_distance("kitten", "sitting")
  end

  test "damerau_levenshtein_distance treats adjacent transposition as single operation" do
    assert_equal 1, FuzzyText.damerau_levenshtein_distance("ab", "ba")
    assert_equal 1, FuzzyText.damerau_levenshtein_distance("cafer", "cafre")
    assert_equal 1, FuzzyText.damerau_levenshtein_distance("rlufo", "rulfo")
  end

  # bounded_damerau_levenshtein
  test "bounded_damerau_levenshtein respects max_distance threshold" do
    assert_equal 0, FuzzyText.bounded_damerau_levenshtein("test", "test", 2)
    assert_equal 1, FuzzyText.bounded_damerau_levenshtein("ab", "ba", 2)
    assert_equal 1, FuzzyText.bounded_damerau_levenshtein("cat", "hat", 1)

    assert_equal 3, FuzzyText.bounded_damerau_levenshtein("cat", "dog", 2)
    assert_equal 3, FuzzyText.bounded_damerau_levenshtein("kitten", "sitting", 2)
  end

  test "bounded_damerau_levenshtein early exits on length disparity" do
    assert_equal 3, FuzzyText.bounded_damerau_levenshtein("a", "abcde", 2)
  end
end
