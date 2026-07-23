class Book < ApplicationRecord
  self.primary_key = "id"

  has_many :checkouts, dependent: :destroy
  has_many :patrons, through: :checkouts
  has_many :book_authorities, dependent: :destroy
  has_many :authorities, through: :book_authorities

  has_many :content_similarities, foreign_key: :book_id, dependent: :destroy
  has_many :similar_books, through: :content_similarities, source: :similar_book

  has_many :outgoing_connections, class_name: "BookConnection", foreign_key: :source_book_id, dependent: :destroy
  has_many :incoming_connections, class_name: "BookConnection", foreign_key: :target_book_id, dependent: :destroy

  validates :id, presence: true, uniqueness: true
  validates :title, presence: true
end
