# frozen_string_literal: true

# Tiny probe endpoint used to diagnose "empty search" deploys on
# Render (or any ephemeral-storage host) without needing shell access.
# Hits the DB so a misconfigured import shows up as a low book count.
class HealthController < ApplicationController
  def show
    render json: {
      status: "ok",
      books: Book.count,
      book_words: BookWord.count,
      fts5_rows: ActiveRecord::Base.connection
                               .execute("SELECT COUNT(*) AS c FROM book_words_fts")
                               .first["c"],
      embeddings: Book.where.not(embedding: nil).count,
      rails_env: Rails.env,
      ruby: RUBY_DESCRIPTION,
      git_sha: ENV["GIT_REV"] || `git rev-parse --short HEAD 2>/dev/null`.strip
    }
  rescue => e
    render json: { status: "error", error: e.class.name, message: e.message }, status: 500
  end
end
