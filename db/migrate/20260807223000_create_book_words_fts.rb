class CreateBookWordsFts < ActiveRecord::Migration[8.1]
  def up
    # Keep this on a single line: the SQLite schema dumper parses virtual
    # tables with a regex that cannot span newlines, and a multi-line
    # CREATE VIRTUAL TABLE makes `bin/rails db:schema:dump` crash.
    execute "CREATE VIRTUAL TABLE book_words_fts USING fts5(word, book_id UNINDEXED, tokenize = 'trigram')"
  end

  def down
    execute "DROP TABLE IF EXISTS book_words_fts"
  end
end
