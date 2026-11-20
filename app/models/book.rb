class Book < ApplicationRecord
  self.primary_key = "id"

  has_many :checkouts, dependent: :destroy
  has_many :patrons, through: :checkouts
  has_many :book_authorities, dependent: :destroy
  has_many :authorities, through: :book_authorities
  has_many :book_words, dependent: :destroy

  has_many :content_similarities, foreign_key: :book_id, dependent: :destroy
  has_many :incoming_content_similarities, class_name: "ContentSimilarity", foreign_key: :similar_book_id, dependent: :destroy
  has_many :similar_books, through: :content_similarities, source: :similar_book

  has_many :outgoing_connections, class_name: "BookConnection", foreign_key: :source_book_id, dependent: :destroy
  has_many :incoming_connections, class_name: "BookConnection", foreign_key: :target_book_id, dependent: :destroy

  before_validation :sync_normalized_fields

  validates :id, presence: true, uniqueness: true
  validates :title, presence: true

  private

  def sync_normalized_fields
    self.normalized_title = FuzzyText.normalize_text(title) if has_attribute?(:normalized_title)
    self.normalized_author = FuzzyText.normalize_text(author) if has_attribute?(:normalized_author)
  end
end
