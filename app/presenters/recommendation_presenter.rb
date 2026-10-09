class RecommendationPresenter
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
    fetch(:match_percentage)
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
    case primary_source
    when "content" then "content"
    when "collaborative" then "collaborative"
    when "authority" then "authority"
    else "hybrid"
    end
  end

  def badge_text
    case primary_source
    when "content" then "Contenido"
    when "collaborative" then "Lectores Afines"
    when "authority" then "Autoridades"
    when "all" then "Híbrido"
    else "Combinado"
    end
  end

  def badge_icon
    case primary_source
    when "content" then "fa-solid fa-book"
    when "collaborative" then "fa-solid fa-users"
    when "authority" then "fa-solid fa-tags"
    when "all" then "fa-solid fa-wand-magic-sparkles"
    else "fa-solid fa-layer-group"
    end
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
