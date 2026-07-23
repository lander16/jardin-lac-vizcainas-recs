class BookConnection < ApplicationRecord
  belongs_to :source_book, class_name: "Book", foreign_key: :source_book_id
  belongs_to :target_book, class_name: "Book", foreign_key: :target_book_id

  validates :source_book_id, presence: true
  validates :target_book_id, presence: true
  validates :target_book_id, uniqueness: { scope: :source_book_id }
end
