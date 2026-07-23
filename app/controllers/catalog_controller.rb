class CatalogController < ApplicationController
  def index
    @total_books = Book.count
    @total_authorities = Authority.count
    @total_connections = BookConnection.count

    @total_links = BookAuthority.count
    @avg_authorities_per_book = (@total_links.to_f / [@total_books, 1].max).round(1)
    @avg_books_per_authority = (@total_links.to_f / [@total_authorities, 1].max).round(1)

    connected_book_ids = (BookConnection.pluck(:source_book_id) + BookConnection.pluck(:target_book_id)).uniq.size
    @percentage_connected = ((connected_book_ids.to_f / [@total_books, 1].max) * 100).round(1)

    @type_counts = Authority.group(:authority_type).order("COUNT(id) DESC").count

    @popular_books = Book.joins(:incoming_connections)
                         .group("books.id")
                         .order("COUNT(book_connections.id) DESC")
                         .limit(5)
                         .select("books.id, books.title, books.author, COUNT(book_connections.id) AS connections_count")

    @books = Book.includes(:authorities).limit(20)
  end

  def search
    query = params[:q].to_s.strip
    limit = (params[:limit] || 100).to_i.clamp(1, 500)

    @books = if query.present?
               CatalogSearchService.search(query, limit: limit)
             else
               Book.includes(:authorities).limit(limit).map do |b|
                 {
                   biblio_id: b.id,
                   title: b.title,
                   author: b.author,
                   authority_count: b.authorities.size,
                   connection_count: b.outgoing_connections.size + b.incoming_connections.size,
                   authorities: b.authorities.map { |a| { authority_id: a.id, name: a.name, type: a.authority_type } }
                 }
               end
             end

    render partial: "catalog/search_results", locals: { books: @books, query: query }
  end

  def graph
    @book = Book.find(params[:id])
  end

  def authorities_by_type
    auth_type = params[:type]
    @type_stats = compute_type_stats(auth_type)
    @authorities = Authority.by_type(auth_type)
                             .order(books_count: :desc)
                             .limit(200)

    render partial: "catalog/authority_inspector_content", locals: {
      auth_type: auth_type,
      type_stats: @type_stats,
      authorities: @authorities,
      selected_authority: nil
    }
  end

  def authority_detail
    @authority = Authority.find(params[:id])
    @books = @authority.books.limit(50)

    render partial: "catalog/authority_books", locals: { authority: @authority, books: @books }
  end

  private

  def compute_type_stats(auth_type)
    authorities = Authority.by_type(auth_type)
    total_auths = authorities.size
    total_links = BookAuthority.joins(:authority).where(authorities: { authority_type: auth_type }).count
    avg_books = total_auths.positive? ? (total_links.to_f / total_auths).round(1) : 0.0
    top_auth = authorities.order(books_count: :desc).first

    {
      total_authorities: total_auths,
      avg_books_per_authority: avg_books,
      top_authority_name: top_auth&.name,
      top_authority_count: top_auth&.books_count || 0
    }
  end
end
