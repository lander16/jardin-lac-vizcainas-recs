class AddIndexesToPatrons < ActiveRecord::Migration[8.1]
  def change
    add_index :patrons, :name
    add_index :patrons, :cardnumber
    add_index :patrons, :email
  end
end
