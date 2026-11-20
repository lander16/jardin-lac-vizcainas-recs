class ContentSimilarity < ApplicationRecord
  belongs_to :book, foreign_key: :book_id
  belongs_to :similar_book, class_name: "Book", foreign_key: :similar_book_id

  validates :book_id, presence: true
  validates :similar_book_id, presence: true
  validates :similar_book_id, uniqueness: { scope: :book_id }
  validates :similarity, presence: true, numericality: { greater_than_or_equal_to: -1.0, less_than_or_equal_to: 1.0 }
  validate :cannot_reference_self

  private

  def cannot_reference_self
    return if book_id.blank? || similar_book_id.blank?
    return unless book_id == similar_book_id

    errors.add(:similar_book_id, "cannot be the same as book_id")
  end
end
