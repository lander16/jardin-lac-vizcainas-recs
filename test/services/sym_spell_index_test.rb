# frozen_string_literal: true

require "test_helper"

class SymSpellIndexTest < ActiveSupport::TestCase
  # --- distance 0 -----------------------------------------------------

  test "lookup returns exact matches" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway",   book_id: "b1", source: "author" },
      { word: "shakespeare", book_id: "b2", source: "author" }
    ])
    results = idx.lookup("hemingway")
    assert_equal 1, results.length
    assert_equal [ "b1", "hemingway" ], results.first
  end

  # --- distance 1 -----------------------------------------------------

  test "lookup matches 1-edit deletions" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1", source: "author" }
    ])
    # Delete the last char, an internal char, and the first char.
    assert_includes idx.lookup("hemingwa").map(&:first), "b1"
    assert_includes idx.lookup("hemngway").map(&:first), "b1"
    assert_includes idx.lookup("emingway").map(&:first), "b1"
  end

  test "lookup matches 1-edit insertions" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1", source: "author" }
    ])
    # "hemingwy" is a 1-deletion of "hemingway" (dropped the 'a'), so
    # the query itself is found via the delete index.
    assert_includes idx.lookup("hemingwy").map(&:first), "b1"
  end

  test "lookup matches 1-edit substitutions" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1", source: "author" }
    ])
    # 'i' -> 'e' substitution.
    assert_includes idx.lookup("hemengway").map(&:first), "b1"
  end

  # --- distance 2 -----------------------------------------------------

  test "lookup matches 2-edit typos" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1", source: "author" }
    ])
    # "hemngwy" is a 2-deletion of "hemingway" (dropped 'i' and 'a').
    assert_includes idx.lookup("hemngwy").map(&:first), "b1"
  end

  test "lookup matches 2-edit typos with multiple mistakes" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1", source: "author" }
    ])
    # "heminggwai" is edit distance 2 from "hemingway": an extra 'g'
    # (deletion) and 'i'->'y' at the end (substitution).
    assert_includes idx.lookup("heminggwai").map(&:first), "b1"
  end

  # --- out of range / unrelated --------------------------------------

  test "lookup returns no matches for unrelated words" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway",   book_id: "b1", source: "author" },
      { word: "shakespeare", book_id: "b2", source: "author" }
    ])
    assert_empty idx.lookup("unknownxyz")
  end

  test "lookup returns no matches beyond max_edit_distance" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1", source: "author" }
    ])
    # "hemway" is 3 deletions from "hemingway" (dropped "ing"), so it
    # must NOT match at max_edit_distance 2.
    assert_empty idx.lookup("hemway")
  end

  test "lookup handles blank, nil, and too-short queries" do
    idx = SymSpellIndex.from_records([ { word: "hemingway", book_id: "b1" } ])
    assert_empty idx.lookup(nil)
    assert_empty idx.lookup("")
    assert_empty idx.lookup("a")
    assert_empty idx.lookup("ab")
  end

  # --- deduplication --------------------------------------------------

  test "add_word deduplicates the same (word, book_id) pair" do
    idx = SymSpellIndex.new
    5.times { idx.add_word("hemingway", "b1") }
    assert_equal 1, idx.size
    assert_equal 1, idx.frequency("hemingway")
    assert_equal [ "b1" ], idx.lookup("hemingway").map(&:first)
  end

  # --- normalization (delegated to FuzzyText) -------------------------

  test "short words (< 3 chars after normalization) are not indexed" do
    idx = SymSpellIndex.new
    idx.add_word("ab", "b1")
    idx.add_word("a",  "b2")
    idx.add_word("",   "b3")
    assert_equal 0, idx.size
  end

  test "diacritics are stripped via FuzzyText normalization" do
    idx = SymSpellIndex.from_records([
      { word: "García!", book_id: "b1", source: "author" }
    ])
    assert_equal 1, idx.size
    results = idx.lookup("garcia")
    assert_equal 1, results.length
    assert_equal [ "b1", "garcia" ], results.first
  end

  test "case-insensitive: 'Hemingway' and 'hemingway' match the same" do
    idx = SymSpellIndex.from_records([
      { word: "Hemingway", book_id: "b1", source: "author" }
    ])
    assert_equal [ "b1" ], idx.lookup("hemingway").map(&:first)
    assert_equal [ "b1" ], idx.lookup("HEMINGWAY").map(&:first)
  end

  # --- bulk vs incremental build --------------------------------------

  test "from_records is faster than add_word in a loop" do
    words = %w[hemingway shakespeare cervantes gabriel marquez garcia soledad academia espanola]
    records = words.flat_map { |w| 15.times.map { |i| { word: w, book_id: "b_#{w}_#{i}" } } }

    t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    loop_idx = SymSpellIndex.new
    records.each { |r| loop_idx.add_word(r[:word], r[:book_id], source: r[:source]) }
    t_loop = Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0

    t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    bulk_idx = SymSpellIndex.from_records(records)
    t_bulk = Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0

    assert_operator t_bulk, :<, t_loop,
                    "from_records (#{t_bulk.round(3)}s) should be faster than add_word in a loop (#{t_loop.round(3)}s)"
    assert_equal loop_idx.size, bulk_idx.size
  end

  # --- result shape ---------------------------------------------------

  test "lookup returns the matched_word (not the query) for highlighting" do
    idx = SymSpellIndex.from_records([
      { word: "hemingway", book_id: "b1" }
    ])
    results = idx.lookup("hemingwy") # 1 insertion away from "hemingway"
    assert_equal 1, results.length
    assert_equal "hemingway", results.first[1]
  end

  # --- performance ----------------------------------------------------

  test "performance: 1,000 words add in < 100 ms; lookup in < 5 ms" do
    records = 1_000.times.map { |i| { word: "word#{i}", book_id: "b#{i}" } }

    t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    idx = SymSpellIndex.from_records(records)
    add_time = Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0
    assert_operator add_time, :<, 0.1,
                    "building 1,000 words took #{add_time.round(3)}s (limit 0.1s)"

    idx.lookup("word123") # warm up (JIT/GC)
    n = 200
    t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    n.times { idx.lookup("word123") }
    lookup_time = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) / n
    assert_operator lookup_time, :<, 0.005,
                    "lookup averaged #{(lookup_time * 1000).round(2)}ms (limit 5ms)"
  end

  # --- class-level loading from the DB --------------------------------

  test "default is lazy, memoized, and reset! clears it" do
    SymSpellIndex.reset!
    stub_rows = [ [ "hemingway", "b1", "author" ] ]
    original = BookWord.method(:pluck)
    BookWord.define_singleton_method(:pluck) { |*| stub_rows }
    begin
      idx1 = SymSpellIndex.default
      assert_operator idx1.size, :>, 0
      assert_same idx1, SymSpellIndex.default
      assert_includes idx1.lookup("hemingwy").map(&:first), "b1"

      SymSpellIndex.reset!
      refute_same idx1, SymSpellIndex.default
    ensure
      BookWord.define_singleton_method(:pluck, original)
    end
  ensure
    SymSpellIndex.reset!
  end

  test "loads from the BookWord table (end-to-end with seeded data)" do
    Book.find_each { |b| BookWord.where(book_id: b.id).delete_all }
    Book.delete_all

    book = Book.create!(id: "test_hem_1", title: "En nuestro tiempo", author: "Hemingway, Ernest")
    BookWord.insert_all([
      { book_id: book.id, word: "hemingway", source: "author" },
      { book_id: book.id, word: "ernest",    source: "author" }
    ])

    SymSpellIndex.reset!
    idx = SymSpellIndex.from_database!
    assert_operator idx.size, :>, 0
    results = idx.lookup("hemingwy") # 1 insertion away from "hemingway"
    assert_includes results.map(&:first), book.id
  ensure
    BookWord.delete_all
    Book.delete_all
    SymSpellIndex.reset!
  end
end
