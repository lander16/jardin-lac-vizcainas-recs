# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_23_180008) do
  create_table "authorities", id: :string, force: :cascade do |t|
    t.string "authority_type", null: false
    t.integer "books_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "marc_field"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["authority_type"], name: "index_authorities_on_authority_type"
    t.index ["name"], name: "index_authorities_on_name"
  end

  create_table "book_authorities", force: :cascade do |t|
    t.string "authority_id", null: false
    t.string "book_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["authority_id"], name: "index_book_authorities_on_authority_id"
    t.index ["book_id", "authority_id"], name: "index_book_authorities_on_book_id_and_authority_id", unique: true
    t.index ["book_id"], name: "index_book_authorities_on_book_id"
  end

  create_table "book_connections", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "source_book_id", null: false
    t.string "target_book_id", null: false
    t.datetime "updated_at", null: false
    t.integer "weight", null: false
    t.index ["source_book_id", "target_book_id"], name: "index_book_connections_on_source_book_id_and_target_book_id", unique: true
    t.index ["source_book_id"], name: "index_book_connections_on_source_book_id"
    t.index ["target_book_id"], name: "index_book_connections_on_target_book_id"
  end

  create_table "books", id: :string, force: :cascade do |t|
    t.string "author"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "source"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["title"], name: "index_books_on_title"
  end

  create_table "checkouts", force: :cascade do |t|
    t.string "book_id", null: false
    t.datetime "checkout_date"
    t.datetime "created_at", null: false
    t.string "patron_id", null: false
    t.boolean "simulated", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["book_id"], name: "index_checkouts_on_book_id"
    t.index ["patron_id", "book_id"], name: "index_checkouts_on_patron_id_and_book_id"
    t.index ["patron_id"], name: "index_checkouts_on_patron_id"
  end

  create_table "content_similarities", force: :cascade do |t|
    t.string "book_id", null: false
    t.datetime "created_at", null: false
    t.string "similar_book_id", null: false
    t.float "similarity", null: false
    t.datetime "updated_at", null: false
    t.index ["book_id", "similar_book_id"], name: "index_content_similarities_on_book_id_and_similar_book_id", unique: true
    t.index ["book_id"], name: "index_content_similarities_on_book_id"
    t.index ["similar_book_id"], name: "index_content_similarities_on_similar_book_id"
  end

  create_table "patrons", id: :string, force: :cascade do |t|
    t.string "cardnumber"
    t.integer "checkouts_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name", null: false
    t.datetime "updated_at", null: false
  end

  create_table "user_similarities", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.float "jaccard_score", null: false
    t.string "patron_id", null: false
    t.string "similar_patron_id", null: false
    t.datetime "updated_at", null: false
    t.index ["patron_id", "similar_patron_id"], name: "index_user_similarities_on_patron_id_and_similar_patron_id", unique: true
    t.index ["patron_id"], name: "index_user_similarities_on_patron_id"
    t.index ["similar_patron_id"], name: "index_user_similarities_on_similar_patron_id"
  end
end
