class UsersController < ApplicationController
  before_action :set_patron

  def show
    @checkouts = @patron.checkouts.includes(:book).order(checkout_date: :desc)
    @w_content = (params[:w_content] || 0.33).to_f
    @w_collab = (params[:w_collab] || 0.33).to_f
    @w_auth = (params[:w_auth] || 0.34).to_f

    @recommendations = RecommendationService.new(@patron).recommend(
      w_content: @w_content,
      w_collab: @w_collab,
      w_auth: @w_auth
    )
  end

  def graph
  end

  def recommendations_frame
    w_content = params[:w_content].to_f
    w_collab = params[:w_collab].to_f
    w_auth = params[:w_auth].to_f

    @recommendations = RecommendationService.new(@patron).recommend(
      w_content: w_content,
      w_collab: w_collab,
      w_auth: w_auth
    )

    render partial: "users/recommendations_list", locals: { recommendations: @recommendations }
  end

  def checkout_search
    query = params[:q].to_s.strip.downcase
    @books = if query.present? && query.length >= 2
               Book.where("LOWER(title) LIKE ? OR LOWER(author) LIKE ?", "%#{query}%", "%#{query}%")
                   .limit(20)
             else
               []
             end

    render partial: "users/checkout_search_results", locals: { books: @books, patron: @patron }
  end

  def checkout
    book_id = params[:book_id].to_s
    book = Book.find_by(id: book_id)

    unless book
      # Create book if title provided
      if params[:title].present?
        book = Book.create!(id: book_id, title: params[:title], author: params[:author], source: "ui")
      else
        redirect_to user_path(@patron), alert: "Libro no encontrado"
        return
      end
    end

    Checkout.find_or_create_by!(patron: @patron, book: book) do |c|
      c.checkout_date = Time.current
      c.simulated = true
    end

    redirect_to user_path(@patron), notice: "Préstamo registrado exitosamente para #{@patron.name}."
  end

  private

  def set_patron
    @patron = Patron.find(params[:id])
  end
end
