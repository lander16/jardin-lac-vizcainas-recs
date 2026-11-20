# frozen_string_literal: true

class CatalogController < ApplicationController
  def index
    stats = CatalogStats.call
    @total_books = stats[:total_books]
    @total_authorities = stats[:total_authorities]
    @total_connections = stats[:total_connections]
    @total_links = stats[:total_links]
    @avg_authorities_per_book = stats[:avg_authorities_per_book]
    @avg_books_per_authority = stats[:avg_books_per_authority]
    @percentage_connected = stats[:percentage_connected]
    @type_counts = stats[:type_counts]
    @popular_books = stats[:popular_books]

    @semantic_search_available = QueryEmbedder.default.available?
    @query = params[:q].to_s.strip

    @books = if @query.present?
               CatalogBookPresenter.wrap(CatalogSearchService.search(@query, limit: 100))
    else
               default_catalog_books(20)
    end
  end

  def search
    @semantic_search_available = QueryEmbedder.default.available?
    query = params[:q].to_s.strip
    limit = Integer(params[:limit], exception: false)&.clamp(1, 500) || 100

    @books = if query.present?
               CatalogBookPresenter.wrap(CatalogSearchService.search(query, limit: limit))
    else
               default_catalog_books(limit)
    end

    render partial: "catalog/search_results", locals: { books: @books, query: query }
  end

  def graph
    @book = Book.find(params[:id])
  end

  def authorities_by_type
    auth_type = params[:type]
    @authorities = Authority.by_type(auth_type)
                            .order(books_count: :desc, name: :asc)
                            .limit(200)
                            .to_a
    @type_stats = compute_type_stats(auth_type)

    render partial: "catalog/authority_inspector_content", locals: {
      auth_type: auth_type,
      type_stats: @type_stats,
      authorities: @authorities,
      selected_authority: nil
    }
  end

  def authority_detail
    @authority = Authority.find(params[:id])
    @books = @authority.books.select(:id, :title, :author).order(:title).limit(50)

    render partial: "catalog/authority_books", locals: { authority: @authority, books: @books }
  end

  private

  def default_catalog_books(limit)
    books = Book.select(:id, :title, :author).includes(:authorities).order(:title).limit(limit).to_a
    CatalogBookPresenter.wrap(books, connection_counts: BookConnection.counts_for(books.map(&:id)))
  end

  def compute_type_stats(auth_type)
    scope = Authority.by_type(auth_type)
    total_auths, total_books_sum = scope.pick(Arel.sql("COUNT(*)"), Arel.sql("COALESCE(SUM(books_count), 0)"))
    total_auths = total_auths.to_i
    avg_books = total_auths.positive? ? (total_books_sum.to_f / total_auths).round(1) : 0.0
    top_auth = @authorities&.first || scope.order(books_count: :desc).first

    {
      total_authorities: total_auths,
      avg_books_per_authority: avg_books,
      top_authority_name: top_auth&.name,
      top_authority_count: top_auth&.books_count || 0
    }
  end
end
