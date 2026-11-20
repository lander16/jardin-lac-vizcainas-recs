require "json"
require "set"

namespace :import do
  desc "Bulk-load semantic embeddings from data/embeddings.bin + data/embeddings_index.json into books.embedding"
  task embeddings: :environment do
    bin_path = Rails.root.join("data", "embeddings.bin")
    index_path = Rails.root.join("data", "embeddings_index.json")

    unless File.exist?(bin_path) && File.exist?(index_path)
      Rails.logger.warn("import:embeddings skipped — missing #{bin_path} or #{index_path}")
      puts "  ! data/embeddings.bin or data/embeddings_index.json missing — run pipeline/embed_books.py first."
      next
    end

    puts "Importing embeddings..."
    index = JSON.parse(File.read(index_path))
    model = index["model"]
    dim = index["dim"].to_i
    unless dim == QueryEmbedder::DIMENSION
      raise "embeddings_index.json dimension mismatch: expected #{QueryEmbedder::DIMENSION}, got #{dim}"
    end

    book_ids = Array(index["book_ids"]).map(&:to_s)
    row_bytes = dim * 4

    unless File.size(bin_path) == book_ids.length * row_bytes
      raise "embeddings.bin size mismatch: expected #{book_ids.length * row_bytes} bytes, got #{File.size(bin_path)}"
    end

    valid_book_ids = Set.new(Book.pluck(:id))
    imported_ids = Set.new
    now = Time.current

    File.open(bin_path, "rb") do |io|
      ActiveRecord::Base.transaction do
        book_ids.each_with_index do |bid, idx|
          bytes = io.read(row_bytes)
          next unless valid_book_ids.include?(bid)
          next unless imported_ids.add?(bid)

          Book.where(id: bid).update_all(
            embedding: bytes,
            embedding_model: model,
            updated_at: now
          )
        end

        stale_ids = (valid_book_ids - imported_ids).to_a
        stale_ids.each_slice(500) do |slice|
          Book.where(id: slice).where.not(embedding: nil).update_all(
            embedding: nil,
            embedding_model: nil,
            updated_at: now
          )
        end
      end
    end

    with_emb = Book.where.not(embedding: nil).count
    puts "  -> #{with_emb} books have an embedding (model=#{model})."
  end
end
