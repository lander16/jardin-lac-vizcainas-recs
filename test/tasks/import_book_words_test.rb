require "test_helper"
require "rake"

class ImportBookWordsTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks
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

  test "skips words shorter than 3 chars after normalization" do
    Book.create!(id: "b2", title: "El Sol", author: "Yo")

    invoke_book_words

    words = BookWord.where(book_id: "b2").pluck(:word)
    # "el" (2 chars) and "yo" (2 chars) are dropped; only "sol" survives.
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
