# frozen_string_literal: true

CURRENT_GIT_SHA = begin
  sha = (
    ENV["RENDER_GIT_COMMIT"].presence ||
    ENV["GIT_REV"].presence ||
    `git rev-parse --short HEAD 2>/dev/null`
  ).to_s.strip.presence || "unknown"
  sha.length > 12 ? sha[0, 7] : sha
end
