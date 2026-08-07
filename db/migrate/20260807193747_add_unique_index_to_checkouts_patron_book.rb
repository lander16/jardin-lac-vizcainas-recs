class AddUniqueIndexToCheckoutsPatronBook < ActiveRecord::Migration[8.1]
  def up
    # Remove any duplicate (patron_id, book_id) rows before creating the
    # unique index. Keep the oldest row per pair.
    execute <<~SQL
      DELETE FROM checkouts
      WHERE id NOT IN (
        SELECT MIN(id) FROM checkouts GROUP BY patron_id, book_id
      )
    SQL

    remove_index :checkouts, name: "index_checkouts_on_patron_id_and_book_id"
    add_index :checkouts, [:patron_id, :book_id], unique: true
  end

  def down
    remove_index :checkouts, [:patron_id, :book_id]
    add_index :checkouts, [:patron_id, :book_id]
  end
end
