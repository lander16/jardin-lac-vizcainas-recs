class UserSimilarity < ApplicationRecord
  belongs_to :patron, foreign_key: :patron_id
  belongs_to :similar_patron, class_name: "Patron", foreign_key: :similar_patron_id

  validates :patron_id, presence: true
  validates :similar_patron_id, presence: true
  validates :similar_patron_id, uniqueness: { scope: :patron_id }
  validates :jaccard_score, presence: true, numericality: { greater_than_or_equal_to: 0.0, less_than_or_equal_to: 1.0 }
  validate :cannot_reference_self

  private

  def cannot_reference_self
    return if patron_id.blank? || similar_patron_id.blank?
    return unless patron_id == similar_patron_id

    errors.add(:similar_patron_id, "cannot be the same as patron_id")
  end
end
