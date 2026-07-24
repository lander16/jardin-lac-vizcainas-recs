Rails.application.routes.draw do
  root "dashboard#show"

  # Dashboard actions
  get "users_search", to: "dashboard#users_search"
  post "reset", to: "dashboard#reset", as: :reset_checkouts

  # Reader pages & frames
  get "users/:id", to: "users#show", as: :user
  get "users/:id/graph", to: "users#graph", as: :user_graph
  get "users/:id/recommendations_frame", to: "users#recommendations_frame", as: :user_recommendations_frame
  get "users/:id/checkout_search", to: "users#checkout_search", as: :user_checkout_search
  post "users/:id/checkout", to: "users#checkout", as: :user_checkout

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
end
