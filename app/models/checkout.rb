class Checkout < ApplicationRecord
  belongs_to :patron, counter_cache: true
  belongs_to :book

  validates :patron_id, presence: true
  validates :book_id, presence: true
end
