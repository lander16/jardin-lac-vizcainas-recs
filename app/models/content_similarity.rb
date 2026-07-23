class ContentSimilarity < ApplicationRecord
  belongs_to :book, foreign_key: :book_id
  belongs_to :similar_book, class_name: "Book", foreign_key: :similar_book_id

  validates :book_id, presence: true
  validates :similar_book_id, presence: true
  validates :similar_book_id, uniqueness: { scope: :book_id }
end
