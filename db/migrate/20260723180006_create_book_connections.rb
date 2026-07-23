class CreateBookConnections < ActiveRecord::Migration[8.1]
  def change
    create_table :book_connections do |t|
      t.string :source_book_id, null: false
      t.string :target_book_id, null: false
      t.integer :weight, null: false

      t.timestamps
    end
    add_index :book_connections, :source_book_id
    add_index :book_connections, :target_book_id
    add_index :book_connections, [:source_book_id, :target_book_id], unique: true
  end
end
