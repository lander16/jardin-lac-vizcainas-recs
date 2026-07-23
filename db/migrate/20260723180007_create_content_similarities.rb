class CreateContentSimilarities < ActiveRecord::Migration[8.1]
  def change
    create_table :content_similarities do |t|
      t.string :book_id, null: false
      t.string :similar_book_id, null: false
      t.float :similarity, null: false

      t.timestamps
    end
    add_index :content_similarities, :book_id
    add_index :content_similarities, :similar_book_id
    add_index :content_similarities, [:book_id, :similar_book_id], unique: true
  end
end
