# frozen_string_literal: true

require "test_helper"
require "rake"
require "tmpdir"

class ImportBookWordsTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks unless Rake::Task.task_defined?("import:book_words")
    @task = Rake::Task["import:book_words"]
  end

  teardown do
    @task.reenable
  end

  def invoke_book_words
    @task.reenable
    @task.invoke
  end

  test "creates BookWord rows for the book's title, author, and linked authorities" do
    book = Book.create!(
      id: "b1",
      title: "Cien Años de Soledad",
      author: "Gabriel García Márquez"
    )
    authority = Authority.create!(
      id: "a1",
      name: "Real Academia Española",
      authority_type: "Institución"
    )
    BookAuthority.create!(book: book, authority: authority)

    invoke_book_words

    title_words = BookWord.where(book_id: "b1", source: "title").pluck(:word)
    author_words = BookWord.where(book_id: "b1", source: "author").pluck(:word)
    authority_words = BookWord.where(book_id: "b1", source: "authority_name").pluck(:word)

    assert_equal [ "cien", "anos", "soledad" ].sort, title_words.sort
    assert_equal [ "gabriel", "garcia", "marquez" ].sort, author_words.sort
    assert_equal [ "real", "academia", "espanola" ].sort, authority_words.sort
  end

  test "populates book_words_fts deduplicated across sources and words" do
    book = Book.create!(
      id: "b_fts",
      title: "Shakespeare en su tiempo",
      author: "Shakespeare, William"
    )
    authority = Authority.create!(
      id: "a_fts",
      name: "Shakespeare, William",
      authority_type: "Autor"
    )
    BookAuthority.create!(book: book, authority: authority)

    invoke_book_words

    assert_equal 3, BookWord.where(book_id: book.id, word: "shakespeare").count

    sql = ActiveRecord::Base.sanitize_sql_array(
      [ "SELECT COUNT(*) FROM book_words_fts WHERE book_id = ? AND word = ?", book.id, "shakespeare" ]
    )
    fts_shakespeare_count = ActiveRecord::Base.connection.select_value(sql).to_i

    assert_equal 1, fts_shakespeare_count
    assert_includes FuzzyBookLookup.candidate_ids_for_token("shakespeare"), book.id
    assert_includes FuzzyBookLookup.candidate_ids_for_token("akespeare"), book.id
  end

  test "runs without error when embeddings_index.json does not exist" do
    book = Book.create!(id: "b_no_emb", title: "Rayuela", author: "Julio Cortázar")
    BookWord
    BookAuthority
    FuzzyText
    FuzzyBookLookup

    Dir.mktmpdir do |tmpdir|
      with_stubbed_class_method(Rails, :root, Pathname.new(tmpdir)) do
        assert_not File.exist?(Rails.root.join("data", "embeddings_index.json"))
        assert_nothing_raised { invoke_book_words }
      end
    end

    assert_includes BookWord.where(book_id: book.id).pluck(:word), "rayuela"
    assert_includes FuzzyBookLookup.candidate_ids_for_token("rayuela"), book.id
  end

  test "skips words shorter than 3 chars after normalization" do
    Book.create!(id: "b2", title: "El Sol", author: "Yo")

    invoke_book_words

    words = BookWord.where(book_id: "b2").pluck(:word)
    assert_equal [ "sol" ], words
  end

  test "re-running the task is idempotent (no duplicate rows)" do
    book = Book.create!(
      id: "b3",
      title: "Pedro Páramo",
      author: "Juan Rulfo"
    )
    authority = Authority.create!(
      id: "a2",
      name: "Letras Mexicanas",
      authority_type: "Tema"
    )
    BookAuthority.create!(book: book, authority: authority)

    invoke_book_words
    count_after_first = BookWord.count
    assert_equal 6, count_after_first

    invoke_book_words

    assert_equal count_after_first, BookWord.count
    assert_equal count_after_first, BookWord.distinct.count(:id)
  end
end
