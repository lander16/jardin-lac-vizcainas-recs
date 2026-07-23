class CreateUserSimilarities < ActiveRecord::Migration[8.1]
  def change
    create_table :user_similarities do |t|
      t.string :patron_id, null: false
      t.string :similar_patron_id, null: false
      t.float :jaccard_score, null: false

      t.timestamps
    end
    add_index :user_similarities, :patron_id
    add_index :user_similarities, :similar_patron_id
    add_index :user_similarities, [:patron_id, :similar_patron_id], unique: true
  end
end
