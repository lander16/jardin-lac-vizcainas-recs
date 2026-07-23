class Authority < ApplicationRecord
  self.primary_key = "id"

  has_many :book_authorities, dependent: :destroy
  has_many :books, through: :book_authorities

  validates :id, presence: true, uniqueness: true
  validates :name, presence: true
  validates :authority_type, presence: true

  scope :by_type, ->(type) { where(authority_type: type) if type.present? }
end
