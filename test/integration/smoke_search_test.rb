require "test_helper"

# Live smoke test for the search pipeline against the actual imported
# catalog (7840 books on the dev/Render DBs).
#
# This is the regression test for the empty-search bug: searching for
# "shakespeare" on Render returned 0 results because FTS5's noisy
# common-trigram matches (e.g. 'sha', 'ake') filled the 50-candidate
# cap (CANDIDATE_LIMIT) and displaced the real Shakespeare books. The
# 3-book fixture used by the unit tests is too small to reproduce that
# FTS5-vs-LIKE-cap interaction — it needs the full dataset.
#
# Because it runs against whatever data happens to be in the test DB,
# it skips gracefully when there is nothing to exercise (Book.count == 0)
# so it never fails on a fresh test DB.
class SmokeSearchTest < ActiveSupport::TestCase
  # Build a fake embedder that responds to .available? and .encode.
  # The smoke test exercises token + FTS5 matching, not semantics, so
  # the embedder is always unavailable (degraded to token-only search).
  def fake_embedder(available:)
    fake = Object.new
    fake.instance_variable_set(:@available, available)
    fake.define_singleton_method(:available?) { @available }
    fake.define_singleton_method(:encode) { |_t| nil }
    fake
  end

  # Run a token-only search (ONNX model disabled via the embedder stub).
  def token_only_search(query, limit:)
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      CatalogSearchService.search(query, limit: limit)
    end
  end

  def skip_unless_data
    skip "no test data (Book.count == 0) — run bin/rails import:all first" if Book.count == 0
  end

  test "shakespeare returns Shakespeare's works, not 0 results" do
    skip_unless_data

    results = token_only_search("shakespeare", limit: 10)

    assert_operator results.size, :>, 0,
                    "search('shakespeare') returned 0 results — the empty-search " \
                    "regression: FTS5 noisy trigram matches displaced the real " \
                    "Shakespeare books in the CANDIDATE_LIMIT cap"

    assert results.first(5).all? { |r| r[:author].to_s.downcase.include?("shakespeare") },
           "top 5 results for 'shakespeare' should be Shakespeare's own works, got: " \
           "#{results.first(5).map { |r| r[:author] }.inspect}"
  end

  test "hemingwy (1-insert typo) finds Hemingway" do
    skip_unless_data

    results = token_only_search("hemingwy", limit: 5)

    assert_operator results.size, :>, 0, "search('hemingwy') returned 0 results"
    assert_equal "Hemingway, Ernest", results.first[:author],
                 "top result for 'hemingwy' should be Hemingway, got: " \
                 "#{results.first&.dig(:author).inspect}"
  end

  test "akespeare (dropped first char) finds Shakespeare" do
    skip_unless_data

    results = token_only_search("akespeare", limit: 5)

    assert_operator results.size, :>, 0, "search('akespeare') returned 0 results"
    assert_equal "Shakespeare, William", results.first[:author],
                 "top result for 'akespeare' should be Shakespeare, got: " \
                 "#{results.first&.dig(:author).inspect}"
  end

  test "rulsfo (transposition) — known FTS5 limitation" do
    skip_unless_data

    results = token_only_search("rulsfo", limit: 5)

    # Documented limitation, not a regression: pure transpositions
    # (chars reordered) introduce boundary trigrams that FTS5's
    # all-trigrams-present matcher can't bridge, so this may return 0.
    puts "rulsfo: #{results.size} results"
  end
end
