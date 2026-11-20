# frozen_string_literal: true

require "test_helper"

# Smoke test for the catalog search pipeline.
# When RUN_IMPORT_SMOKE=1, exercises the full imported catalog (> 7000 books).
# Otherwise seeds a self-contained corpus inside the test transaction when the
# test DB is empty, reproducing the 50-candidate FTS5 trigram cap interaction.
class SmokeSearchTest < ActiveSupport::TestCase
  setup do
    if ENV["RUN_IMPORT_SMOKE"] == "1"
      assert_operator Book.count, :>, 7000
    elsif Book.count == 0
      seed_smoke_corpus!
    end
  end

  test "shakespeare returns Shakespeare's works, not 0 results" do
    results = token_only_search("shakespeare", limit: 10)

    assert_operator results.size, :>, 0,
                    "search('shakespeare') returned 0 results: FTS5 noisy trigram " \
                    "matches displaced the real Shakespeare books in CANDIDATE_LIMIT"

    assert results.first(5).all? { |r| r[:author].to_s.downcase.include?("shakespeare") },
           "top 5 results for 'shakespeare' should be Shakespeare's own works, got: " \
           "#{results.first(5).map { |r| r[:author] }.inspect}"
  end

  test "hemingwy (1-insert typo) finds Hemingway" do
    results = token_only_search("hemingwy", limit: 5)

    assert_operator results.size, :>, 0, "search('hemingwy') returned 0 results"
    assert_equal "Hemingway, Ernest", results.first[:author],
                 "top result for 'hemingwy' should be Hemingway, got: " \
                 "#{results.first&.dig(:author).inspect}"
  end

  test "akespeare (dropped first char) finds Shakespeare" do
    results = token_only_search("akespeare", limit: 5)

    assert_operator results.size, :>, 0, "search('akespeare') returned 0 results"
    assert_equal "Shakespeare, William", results.first[:author],
                 "top result for 'akespeare' should be Shakespeare, got: " \
                 "#{results.first&.dig(:author).inspect}"
  end

  test "rulsfo (transposition) finds Rulfo" do
    results = token_only_search("rulsfo", limit: 5)

    assert_operator results.size, :>, 0, "search('rulsfo') returned 0 results"
    assert_equal "Rulfo, Juan", results.first[:author],
                 "top result for 'rulsfo' should be Rulfo, got: " \
                 "#{results.first&.dig(:author).inspect}"
  end

  private

  def token_only_search(query, limit:)
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      CatalogSearchService.search(query, limit: limit)
    end
  end

  def seed_smoke_corpus!
    corpus = [
      [ "smoke_shk_1", "Hamlet", "Shakespeare, William" ],
      [ "smoke_shk_2", "Macbeth", "Shakespeare, William" ],
      [ "smoke_shk_3", "Otelo", "Shakespeare, William" ],
      [ "smoke_shk_4", "El rey Lear", "Shakespeare, William" ],
      [ "smoke_shk_5", "La tempestad", "Shakespeare, William" ],
      [ "smoke_hem_1", "The Old Man and the Sea", "Hemingway, Ernest" ],
      [ "smoke_rul_1", "Pedro Páramo", "Rulfo, Juan" ]
    ]

    (1..60).each do |i|
      suffix = format("%02d", i)
      corpus << [ "smoke_noise_#{suffix}", "Shaman Awake Speaker Earth #{suffix}", "Autor Neutro #{suffix}" ]
    end

    now = Time.current
    word_rows = []

    corpus.each do |id, title, author|
      Book.create!(id: id, title: title, author: author)
      FuzzyText.normalize_words(title).each do |word|
        word_rows << { book_id: id, word: word, source: "title", created_at: now, updated_at: now }
      end
      FuzzyText.normalize_words(author).each do |word|
        word_rows << { book_id: id, word: word, source: "author", created_at: now, updated_at: now }
      end
    end

    BookWord.insert_all(word_rows, unique_by: [ :book_id, :word, :source ]) if word_rows.any?
    FuzzyBookLookup.rebuild_from_book_words!
  end
end
