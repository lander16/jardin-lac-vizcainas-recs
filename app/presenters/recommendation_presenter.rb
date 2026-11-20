# frozen_string_literal: true

class RecommendationPresenter
  BADGES = {
    "content" => { css: "content", text: "Contenido", icon: "fa-solid fa-book" }.freeze,
    "collaborative" => { css: "collaborative", text: "Lectores Afines", icon: "fa-solid fa-users" }.freeze,
    "authority" => { css: "authority", text: "Autoridades", icon: "fa-solid fa-tags" }.freeze,
    "all" => { css: "hybrid", text: "Híbrido", icon: "fa-solid fa-wand-magic-sparkles" }.freeze
  }.freeze

  DEFAULT_BADGE = { css: "hybrid", text: "Combinado", icon: "fa-solid fa-layer-group" }.freeze

  attr_reader :recommendation

  def self.wrap(recommendations)
    Array(recommendations).map do |recommendation|
      recommendation.is_a?(self) ? recommendation : new(recommendation)
    end
  end

  def initialize(recommendation)
    @recommendation = recommendation || {}
  end

  def item
    @recommendation
  end

  def book_id
    fetch(:book_id)
  end

  def title
    fetch(:title)
  end

  def author
    fetch(:author)
  end

  def primary_source
    fetch(:primary_source)
  end

  def match_percentage
    val = fetch(:match_percentage)
    val&.to_i&.clamp(0, 100)
  end

  def explanation
    fetch(:explanation)
  end

  def score
    fetch(:score)
  end

  def sources
    fetch(:sources)
  end

  def raw_scores
    fetch(:raw_scores)
  end

  def description
    fetch(:description)
  end

  def accordion_id
    "explanation-#{book_id}"
  end

  def badge_class
    badge[:css]
  end

  def badge_text
    badge[:text]
  end

  def badge_icon
    badge[:icon]
  end

  def [](key)
    fetch(key)
  end

  def to_param
    book_id&.to_s
  end

  def ==(other)
    other.is_a?(self.class) && other.book_id == book_id
  end
  alias_method :eql?, :==

  def hash
    [ self.class, book_id ].hash
  end

  private

  def badge
    BADGES.fetch(primary_source, DEFAULT_BADGE)
  end

  def fetch(key)
    if @recommendation.is_a?(Hash)
      sym = key.to_sym
      return @recommendation[sym] if @recommendation.key?(sym)

      str = key.to_s
      return @recommendation[str] if @recommendation.key?(str)

      nil
    elsif @recommendation.respond_to?(key)
      @recommendation.public_send(key)
    end
  end
end
