class UserSimilarity < ApplicationRecord
  belongs_to :patron, foreign_key: :patron_id
  belongs_to :similar_patron, class_name: "Patron", foreign_key: :similar_patron_id

  validates :patron_id, presence: true
  validates :similar_patron_id, presence: true
  validates :similar_patron_id, uniqueness: { scope: :patron_id }
end
