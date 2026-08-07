require "json"

namespace :import do
  desc "Bulk-load semantic embeddings from data/embeddings.bin + data/embeddings_index.json into books.embedding"
  task embeddings: :environment do
    bin_path = Rails.root.join("data", "embeddings.bin")
    index_path = Rails.root.join("data", "embeddings_index.json")

    unless File.exist?(bin_path) && File.exist?(index_path)
      puts "  ! data/embeddings.bin or data/embeddings_index.json missing — run pipeline/embed_books.py first."
      next
    end

    puts "Importing embeddings..."
    index = JSON.parse(File.read(index_path))
    model = index["model"]
    dim = index["dim"].to_i
    book_ids = index["book_ids"]
    row_bytes = dim * 4 # float32 = 4 bytes

    unless File.size(bin_path) == book_ids.length * row_bytes
      raise "embeddings.bin size mismatch: expected #{book_ids.length * row_bytes} bytes, got #{File.size(bin_path)}"
    end

    valid_book_ids = Set.new(Book.pluck(:id))
    now = Time.current

    File.open(bin_path, "rb") do |io|
      book_ids.each_with_index do |bid, idx|
        next unless valid_book_ids.include?(bid)

        io.seek(idx * row_bytes)
        bytes = io.read(row_bytes)
        Book.where(id: bid).update_all(
          embedding: bytes,
          embedding_model: model,
          updated_at: now,
        )
      end
    end

    # Books present in the catalog but with no embedding (e.g. added
    # after the last pipeline run) get their embedding + model cleared
    # so the runtime never tries to score them with a wrong model.
    Book.where.not(id: book_ids).where.not(embedding: nil).update_all(embedding: nil, embedding_model: nil)

    with_emb = Book.where.not(embedding: nil).count
    puts "  -> #{with_emb} books have an embedding (model=#{model})."
  end
end
