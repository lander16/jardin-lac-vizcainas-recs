class CreateBookWords < ActiveRecord::Migration[8.1]
  def change
    create_table :book_words do |t|
      # Koha biblio id (string), not a Rails integer id.
      t.string :book_id, null: false
      t.string :word, null: false
      t.string :source, null: false

      t.timestamps
    end
    # Same word from the same book + source must not be duplicated.
    add_index :book_words, [ :book_id, :word, :source ], unique: true
    # Speeds up bulk-load `WHERE word IN (...)` queries at search time.
    add_index :book_words, :word
    # For deleting all words of a book (cleanup).
    add_index :book_words, :book_id
  end
end
