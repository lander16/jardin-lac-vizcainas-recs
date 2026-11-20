# frozen_string_literal: true

module CatalogSearch
  class EmbeddingStore
    @mutex = Mutex.new

    class << self
      def vectors_by_id
        scope = Book.where.not(embedding: nil)
        cache_key = [ scope.count, scope.maximum(:updated_at) ]

        @mutex.synchronize do
          if @cache_key != cache_key || @vectors_by_id.nil?
            @vectors_by_id = load_vectors(scope)
            @cache_key = cache_key
          end
          @vectors_by_id
        end
      end

      def reset!
        @mutex.synchronize do
          @cache_key = nil
          @vectors_by_id = nil
        end
      end

      private

      def load_vectors(scope)
        vectors = {}
        scope.pluck(:id, :embedding).each do |id, bytes|
          vector = bytes&.unpack("e*")
          vectors[id] = vector unless vector.blank?
        end
        vectors.freeze
      end
    end
  end
end
