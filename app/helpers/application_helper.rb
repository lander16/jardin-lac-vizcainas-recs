# frozen_string_literal: true

module ApplicationHelper
  def patron_initials(name)
    name.to_s.strip.split(/\s+/).filter_map { |part| part[0] }.first(2).join.upcase
  end

  def pluralize_es(count, singular, plural = nil)
    n = count.to_i
    word = n == 1 ? singular : (plural || "#{singular}s")
    "#{n} #{word}"
  end
end
