class BookConnection < ApplicationRecord
  belongs_to :source_book, class_name: "Book", foreign_key: :source_book_id
  belongs_to :target_book, class_name: "Book", foreign_key: :target_book_id

  validates :source_book_id, presence: true
  validates :target_book_id, presence: true
  validates :target_book_id, uniqueness: { scope: :source_book_id }
  validates :weight, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validate :cannot_connect_to_self

  def self.counts_for(book_ids)
    ids = Array(book_ids).compact
    return {} if ids.empty?

    outgoing = where(source_book_id: ids).group(:source_book_id).count
    incoming = where(target_book_id: ids).group(:target_book_id).count
    outgoing.merge(incoming) { |_id, out_count, in_count| out_count + in_count }
  end

  private

  def cannot_connect_to_self
    return if source_book_id.blank? || target_book_id.blank?
    return unless source_book_id == target_book_id

    errors.add(:target_book_id, "cannot be the same as source_book_id")
  end
end
