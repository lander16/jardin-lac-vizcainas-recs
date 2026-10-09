class CatalogBookPresenter
  AuthorityItem = Struct.new(:name, :authority_type, keyword_init: true) do
    def type
      authority_type
    end

    def [](key)
      return authority_type if key == :type || key == "type"

      super
    end
  end

  attr_reader :item, :connection_counts

  def self.wrap(items, connection_counts: {})
    Array(items).map do |item|
      item.is_a?(self) ? item : new(item, connection_counts: connection_counts)
    end
  end

  def initialize(item, connection_counts: {})
    @item = item
    @connection_counts = connection_counts || {}
  end

  def id
    if hash?
      @item[:biblio_id] || @item["biblio_id"] || @item[:id] || @item["id"]
    else
      @item.id
    end
  end

  def title
    if hash?
      @item[:title] || @item["title"]
    else
      @item.title
    end
  end

  def author
    if hash?
      @item[:author] || @item["author"]
    else
      @item.author
    end
  end

  def match_score
    if hash?
      @item[:match_score] || @item["match_score"]
    elsif @item.respond_to?(:match_score)
      @item.match_score
    end
  end

  def match_explanation
    if hash?
      @item[:match_explanation] || @item["match_explanation"]
    elsif @item.respond_to?(:match_explanation)
      @item.match_explanation
    end
  end

  def connection_count
    if hash?
      count = @item[:connection_count] || @item["connection_count"]
      return count if count

      lookup_connection_count || 0
    else
      lookup_connection_count || precomputed_or_association_connection_count
    end
  end

  def authorities
    @authorities ||= raw_authorities.map { |auth| build_authority_item(auth) }
  end

  def authority_count
    if hash?
      @item[:authority_count] || @item["authority_count"] || authorities.size
    else
      authorities.size
    end
  end

  def semantic_score
    if hash?
      @item[:semantic_score] || @item["semantic_score"]
    elsif @item.respond_to?(:semantic_score)
      @item.semantic_score
    end
  end

  def to_param
    id&.to_s
  end

  def to_model
    self
  end

  def ==(other)
    other.is_a?(self.class) && other.id == id
  end
  alias eql? ==

  def hash
    [ self.class, id ].hash
  end

  private

  def hash?
    @item.is_a?(Hash)
  end

  def lookup_connection_count
    return nil if @connection_counts.blank?

    if @connection_counts.key?(id)
      @connection_counts[id] || 0
    elsif id && @connection_counts.key?(id.to_s)
      @connection_counts[id.to_s] || 0
    end
  end

  def precomputed_or_association_connection_count
    if @item.respond_to?(:connection_count) && @item.connection_count.present?
      @item.connection_count.to_i
    elsif @item.respond_to?(:connections_count) && @item.connections_count.present?
      @item.connections_count.to_i
    elsif @item.respond_to?(:outgoing_connections) && @item.respond_to?(:incoming_connections)
      @item.outgoing_connections.size + @item.incoming_connections.size
    else
      0
    end
  end

  def raw_authorities
    if hash?
      @item[:authorities] || @item["authorities"] || []
    elsif @item.respond_to?(:authorities)
      @item.authorities || []
    else
      []
    end
  end

  def build_authority_item(auth)
    if auth.is_a?(AuthorityItem)
      auth
    elsif auth.is_a?(Hash)
      name = auth[:name] || auth["name"]
      type = auth[:authority_type] || auth["authority_type"] || auth[:type] || auth["type"]
      AuthorityItem.new(name: name, authority_type: type)
    else
      name = auth.respond_to?(:name) ? auth.name : nil
      type = if auth.respond_to?(:authority_type)
               auth.authority_type
      elsif auth.respond_to?(:type)
               auth.type
      end
      AuthorityItem.new(name: name, authority_type: type)
    end
  end
end
