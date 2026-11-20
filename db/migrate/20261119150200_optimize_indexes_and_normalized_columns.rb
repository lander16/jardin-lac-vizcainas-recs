class OptimizeIndexesAndNormalizedColumns < ActiveRecord::Migration[8.1]
  def change
    add_column :books, :normalized_title, :string
    add_column :books, :normalized_author, :string
    add_index :books, :normalized_title
    add_index :books, :normalized_author

    add_column :patrons, :normalized_name, :string
    add_index :patrons, :normalized_name

    # Drop redundant left-prefix indexes already covered by composite indexes
    remove_index :book_authorities, name: "index_book_authorities_on_book_id", column: :book_id, if_exists: true
    remove_index :book_connections, name: "index_book_connections_on_source_book_id", column: :source_book_id, if_exists: true
    remove_index :book_words, name: "index_book_words_on_book_id", column: :book_id, if_exists: true
    remove_index :checkouts, name: "index_checkouts_on_patron_id", column: :patron_id, if_exists: true
    remove_index :content_similarities, name: "index_content_similarities_on_book_id", column: :book_id, if_exists: true
    remove_index :user_similarities, name: "index_user_similarities_on_patron_id", column: :patron_id, if_exists: true

    # Composite indexes eliminating temp B-tree sorts on core queries
    add_index :authorities, [ :authority_type, :books_count ], if_not_exists: true
    add_index :content_similarities, [ :book_id, :similarity ], if_not_exists: true
    add_index :content_similarities, [ :similar_book_id, :similarity ], if_not_exists: true
    add_index :user_similarities, [ :patron_id, :jaccard_score ], if_not_exists: true
    add_index :book_connections, [ :source_book_id, :weight ], if_not_exists: true
    add_index :book_connections, [ :target_book_id, :weight ], if_not_exists: true
    add_index :checkouts, [ :patron_id, :checkout_date ], if_not_exists: true
  end
end
