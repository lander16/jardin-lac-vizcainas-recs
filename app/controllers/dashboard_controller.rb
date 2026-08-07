class DashboardController < ApplicationController
  def show
    @total_users = Patron.count
    @total_books = Book.count
    @total_checkouts = Checkout.count

    @popular_books = Book.joins(:checkouts)
                         .group("books.id")
                         .order("COUNT(checkouts.id) DESC")
                         .limit(5)
                         .select("books.id, books.title, COUNT(checkouts.id) AS checkouts_count")

    @users = Patron.order(:name)
  end

  def users_search
    query = params[:q].to_s.strip.downcase
    @users = if query.present?
               escaped = "%#{ActiveRecord::Base.sanitize_sql_like(query)}%"
               Patron.where("LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR cardnumber LIKE ?",
                            escaped, escaped, escaped)
                     .order(:name)
    else
               Patron.order(:name)
    end

    render partial: "dashboard/users_table", locals: { users: @users }
  end
end
