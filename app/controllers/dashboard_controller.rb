# frozen_string_literal: true

class DashboardController < ApplicationController
  def show
    @total_users = Patron.count
    @total_books = Book.count
    @total_checkouts = Checkout.count

    @popular_books = Book.joins(:checkouts)
                         .group("books.id")
                         .order(Arel.sql("COUNT(checkouts.id) DESC"))
                         .limit(5)
                         .select("books.id, books.title, COUNT(checkouts.id) AS checkouts_count")

    @users = Patron.order(:name)
  end

  def users_search
    raw_query = params[:q].to_s.strip
    normalized_query = FuzzyText.normalize_text(raw_query)

    @users = if raw_query.present?
               raw_like = "%#{ActiveRecord::Base.sanitize_sql_like(raw_query.downcase)}%"
               name_column = Patron.column_names.include?("normalized_name") ? "normalized_name" : "LOWER(name)"
               name_pattern = normalized_query.present? ? "%#{ActiveRecord::Base.sanitize_sql_like(normalized_query)}%" : raw_like

               Patron.where("#{name_column} LIKE ? OR LOWER(email) LIKE ? OR LOWER(cardnumber) LIKE ?",
                            name_pattern, raw_like, raw_like)
                     .order(:name)
    else
               Patron.order(:name)
    end

    render partial: "dashboard/users_table", locals: { users: @users }
  end
end
