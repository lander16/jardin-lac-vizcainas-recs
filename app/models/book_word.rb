class BookWord < ApplicationRecord
  SOURCES = %w[title author authority_name].freeze

  belongs_to :book

  validates :book_id, presence: true
  validates :word, presence: true, uniqueness: { scope: [ :book_id, :source ] }
  validates :source, presence: true, inclusion: { in: SOURCES }
end
