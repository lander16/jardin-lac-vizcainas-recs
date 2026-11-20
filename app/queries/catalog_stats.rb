# frozen_string_literal: true

class CatalogStats
  def self.call
    new.call
  end

  def call
    total_books = Book.count
    total_authorities = Authority.count
    total_connections = BookConnection.count
    total_links = BookAuthority.count

    connected_books_count = ActiveRecord::Base.connection.select_value(<<~SQL).to_i
      SELECT COUNT(*) FROM (
        SELECT source_book_id AS book_id FROM book_connections
        UNION
        SELECT target_book_id AS book_id FROM book_connections
      )
    SQL

    connection_counts_sql = <<~SQL.squish
      SELECT source_book_id AS book_id FROM book_connections
      UNION ALL
      SELECT target_book_id AS book_id FROM book_connections
    SQL

    popular_books = Book.joins("INNER JOIN (#{connection_counts_sql}) connection_books ON connection_books.book_id = books.id")
                        .group("books.id")
                        .order(Arel.sql("COUNT(connection_books.book_id) DESC"))
                        .limit(5)
                        .select("books.id, books.title, books.author, COUNT(connection_books.book_id) AS connections_count")
                        .to_a

    {
      total_books: total_books,
      total_authorities: total_authorities,
      total_connections: total_connections,
      total_links: total_links,
      avg_authorities_per_book: (total_links.to_f / [ total_books, 1 ].max).round(1),
      avg_books_per_authority: (total_links.to_f / [ total_authorities, 1 ].max).round(1),
      percentage_connected: ((connected_books_count.to_f / [ total_books, 1 ].max) * 100).round(1),
      type_counts: Authority.group(:authority_type).order(Arel.sql("COUNT(id) DESC")).count,
      popular_books: popular_books
    }
  end
end
