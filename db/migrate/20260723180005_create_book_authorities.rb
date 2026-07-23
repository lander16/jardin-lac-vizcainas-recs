class CreateBookAuthorities < ActiveRecord::Migration[8.1]
  def change
    create_table :book_authorities do |t|
      t.string :book_id, null: false
      t.string :authority_id, null: false

      t.timestamps
    end
    add_index :book_authorities, :book_id
    add_index :book_authorities, :authority_id
    add_index :book_authorities, [:book_id, :authority_id], unique: true
  end
end
