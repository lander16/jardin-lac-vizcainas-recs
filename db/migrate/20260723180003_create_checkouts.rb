class CreateCheckouts < ActiveRecord::Migration[8.1]
  def change
    create_table :checkouts do |t|
      t.string :patron_id, null: false
      t.string :book_id, null: false
      t.datetime :checkout_date
      t.boolean :simulated, default: false, null: false

      t.timestamps
    end
    add_index :checkouts, :patron_id
    add_index :checkouts, :book_id
    add_index :checkouts, [ :patron_id, :book_id ]
  end
end
