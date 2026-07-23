class CreateAuthorities < ActiveRecord::Migration[8.1]
  def change
    create_table :authorities, id: false do |t|
      t.string :id, primary_key: true
      t.string :name, null: false
      t.string :authority_type, null: false
      t.string :marc_field
      t.integer :books_count, default: 0, null: false

      t.timestamps
    end
    add_index :authorities, :authority_type
    add_index :authorities, :name
  end
end
