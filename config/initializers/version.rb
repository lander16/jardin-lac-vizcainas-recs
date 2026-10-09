# frozen_string_literal: true

CURRENT_GIT_SHA = ENV["GIT_REV"].presence || `git rev-parse --short HEAD 2>/dev/null`.strip.presence || "unknown"
