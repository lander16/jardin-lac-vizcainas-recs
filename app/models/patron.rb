class Patron < ApplicationRecord
  self.primary_key = "id"

  has_many :checkouts, dependent: :destroy
  has_many :books, through: :checkouts
  has_many :user_similarities, foreign_key: :patron_id, dependent: :destroy
  has_many :similar_patrons, through: :user_similarities, source: :similar_patron

  validates :id, presence: true, uniqueness: true
  validates :name, presence: true
end
