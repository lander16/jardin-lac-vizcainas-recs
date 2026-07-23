class CreatePatrons < ActiveRecord::Migration[8.1]
  def change
    create_table :patrons, id: false do |t|
      t.string :id, primary_key: true
      t.string :name, null: false
      t.string :email
      t.string :cardnumber
      t.integer :checkouts_count, default: 0, null: false

      t.timestamps
    end
  end
end
