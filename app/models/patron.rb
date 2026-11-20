class Patron < ApplicationRecord
  self.primary_key = "id"

  has_many :checkouts, dependent: :destroy
  has_many :books, through: :checkouts
  has_many :user_similarities, foreign_key: :patron_id, dependent: :destroy
  has_many :incoming_user_similarities, class_name: "UserSimilarity", foreign_key: :similar_patron_id, dependent: :destroy
  has_many :similar_patrons, through: :user_similarities, source: :similar_patron

  before_validation :sync_normalized_name

  validates :id, presence: true, uniqueness: true
  validates :name, presence: true

  private

  def sync_normalized_name
    self.normalized_name = FuzzyText.normalize_text(name) if has_attribute?(:normalized_name)
  end
end
