# frozen_string_literal: true

require "sqlite3"

class HealthController < ActionController::Base
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
      git_sha: CURRENT_GIT_SHA
    }
  rescue ActiveRecord::ActiveRecordError, SQLite3::Exception => e
    Rails.logger.error("Health check failed: #{e.class}: #{e.message}")
    render json: { status: "error" }, status: :internal_server_error
  end
end
