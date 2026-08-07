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
    # Provide defaults so a direct hit to the frame (e.g. from a bookmark)
    # still produces sensible results, not a zero-weight ranking.
    w_content = (params[:w_content] || 0.33).to_f
    w_collab  = (params[:w_collab]  || 0.33).to_f
    w_auth    = (params[:w_auth]    || 0.34).to_f

    @recommendations = RecommendationService.new(@patron).recommend(
      w_content: w_content,
      w_collab: w_collab,
      w_auth: w_auth
    )

    render partial: "users/recommendations_list", locals: { recommendations: @recommendations }
  end

  private

  def set_patron
    @patron = Patron.find(params[:id])
  end
end
