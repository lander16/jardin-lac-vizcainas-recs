Rails.application.routes.draw do
  root "dashboard#show"

  # Dashboard actions
  get "users_search", to: "dashboard#users_search"

  # Reader pages & frames
  get "users/:id", to: "users#show", as: :user
  get "users/:id/graph", to: "users#graph", as: :user_graph
  get "users/:id/recommendations_frame", to: "users#recommendations_frame", as: :user_recommendations_frame

  # Book details
  get "books/:id", to: "books#show", as: :book

  # Catalog pages & frames
  get "catalog", to: "catalog#index", as: :catalog
  get "catalog/search", to: "catalog#search", as: :catalog_search
  get "catalog/graph/:id", to: "catalog#graph", as: :catalog_graph
  get "catalog/authorities/:type", to: "catalog#authorities_by_type", as: :catalog_authorities_by_type
  get "catalog/authorities/:type/:id", to: "catalog#authority_detail", as: :catalog_authority_detail

  # JSON API for D3 Graph visualizations
  namespace :api do
    get "graph/:id", to: "graphs#user", as: :user_graph
    get "catalog/graph/:id", to: "graphs#catalog", as: :catalog_graph
  end

  # Custom error pages
  match "/404", to: "errors#not_found", via: :all
  match "/500", to: "errors#internal_server_error", via: :all

  # Liveness / data-presence probe. Used to diagnose "empty search"
  # deploys on Render without needing shell access.
  get "/healthz", to: "health#show"
end
