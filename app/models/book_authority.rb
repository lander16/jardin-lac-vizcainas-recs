class BookAuthority < ApplicationRecord
  belongs_to :book
  belongs_to :authority, counter_cache: :books_count

  validates :book_id, presence: true
  validates :authority_id, presence: true
  validates :authority_id, uniqueness: { scope: :book_id }
end
