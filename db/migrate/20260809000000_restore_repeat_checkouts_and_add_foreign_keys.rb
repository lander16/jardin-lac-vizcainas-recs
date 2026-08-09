class RestoreRepeatCheckoutsAndAddForeignKeys < ActiveRecord::Migration[8.1]
  def up
    delete_orphans

    remove_index :checkouts, name: "index_checkouts_on_patron_id_and_book_id", if_exists: true
    add_index :checkouts, [ :patron_id, :book_id ], if_not_exists: true

    add_foreign_key :checkouts, :patrons, column: :patron_id
    add_foreign_key :checkouts, :books, column: :book_id

    add_foreign_key :book_authorities, :books, column: :book_id
    add_foreign_key :book_authorities, :authorities, column: :authority_id

    add_foreign_key :book_connections, :books, column: :source_book_id
    add_foreign_key :book_connections, :books, column: :target_book_id

    add_foreign_key :content_similarities, :books, column: :book_id
    add_foreign_key :content_similarities, :books, column: :similar_book_id

    add_foreign_key :user_similarities, :patrons, column: :patron_id
    add_foreign_key :user_similarities, :patrons, column: :similar_patron_id

    add_foreign_key :book_words, :books, column: :book_id
  end

  def down
    remove_foreign_key :book_words, column: :book_id

    remove_foreign_key :user_similarities, column: :similar_patron_id
    remove_foreign_key :user_similarities, column: :patron_id

    remove_foreign_key :content_similarities, column: :similar_book_id
    remove_foreign_key :content_similarities, column: :book_id

    remove_foreign_key :book_connections, column: :target_book_id
    remove_foreign_key :book_connections, column: :source_book_id

    remove_foreign_key :book_authorities, column: :authority_id
    remove_foreign_key :book_authorities, column: :book_id

    remove_foreign_key :checkouts, column: :book_id
    remove_foreign_key :checkouts, column: :patron_id

    remove_index :checkouts, name: "index_checkouts_on_patron_id_and_book_id", if_exists: true
    add_index :checkouts, [ :patron_id, :book_id ], unique: true
  end

  private

  def delete_orphans
    execute "DELETE FROM checkouts WHERE patron_id NOT IN (SELECT id FROM patrons) OR book_id NOT IN (SELECT id FROM books)"
    execute "DELETE FROM book_authorities WHERE book_id NOT IN (SELECT id FROM books) OR authority_id NOT IN (SELECT id FROM authorities)"
    execute "DELETE FROM book_connections WHERE source_book_id NOT IN (SELECT id FROM books) OR target_book_id NOT IN (SELECT id FROM books)"
    execute "DELETE FROM content_similarities WHERE book_id NOT IN (SELECT id FROM books) OR similar_book_id NOT IN (SELECT id FROM books)"
    execute "DELETE FROM user_similarities WHERE patron_id NOT IN (SELECT id FROM patrons) OR similar_patron_id NOT IN (SELECT id FROM patrons)"
    execute "DELETE FROM book_words WHERE book_id NOT IN (SELECT id FROM books)"
  end
end
