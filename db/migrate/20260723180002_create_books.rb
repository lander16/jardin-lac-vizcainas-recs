class CreateBooks < ActiveRecord::Migration[8.1]
  def change
    create_table :books, id: false do |t|
      t.string :id, primary_key: true
      t.string :title, null: false
      t.text :description
      t.string :author
      t.string :source

      t.timestamps
    end
    add_index :books, :title
  end
end
