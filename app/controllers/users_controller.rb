# frozen_string_literal: true

class UsersController < ApplicationController
  before_action :set_patron

  def show
    @checkouts = @patron.checkouts.includes(:book).order(checkout_date: :desc)
    @w_content, @w_collab, @w_auth = RecommendationService.normalize_weights(
      w_content: params[:w_content],
      w_collab: params[:w_collab],
      w_auth: params[:w_auth],
      alpha: params[:alpha]
    )

    @recommendations = RecommendationPresenter.wrap(
      RecommendationService.new(@patron).recommend(
        w_content: @w_content,
        w_collab: @w_collab,
        w_auth: @w_auth
      )
    )
  end

  def graph
  end

  def recommendations_frame
    w_content, w_collab, w_auth = RecommendationService.normalize_weights(
      w_content: params[:w_content],
      w_collab: params[:w_collab],
      w_auth: params[:w_auth],
      alpha: params[:alpha]
    )

    @recommendations = RecommendationPresenter.wrap(
      RecommendationService.new(@patron).recommend(
        w_content: w_content,
        w_collab: w_collab,
        w_auth: w_auth
      )
    )

    render partial: "users/recommendations_list", locals: { recommendations: @recommendations }
  end

  private

  def set_patron
    @patron = Patron.find(params[:id])
  end
end
