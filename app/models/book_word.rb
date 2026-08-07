class BookWord < ApplicationRecord
  belongs_to :book

  validates :book_id, presence: true
  validates :word, presence: true
  validates :source, presence: true
end
