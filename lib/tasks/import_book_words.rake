require "json"

namespace :import do
  desc "Build a per-word index of titles, authors, and authority names for fuzzy search"
  task book_words: :environment do
    index_path = Rails.root.join("data", "embeddings_index.json")
    unless File.exist?(index_path)
      puts "  ! data/embeddings_index.json missing — run pipeline/embed_books.py first."
      next
    end

    puts "Importing book words..."
    BookWord.delete_all
    now = Time.current

    title_count = 0
    author_count = 0
    authority_count = 0

    batch = []
    flush = lambda do
      batch.each_slice(1000) do |slice|
        BookWord.insert_all(slice, unique_by: [ :book_id, :word, :source ])
      end
      batch.clear
    end

    Book.find_each do |book|
      FuzzyText.normalize_words(book.title).each do |word|
        batch << { book_id: book.id, word: word, source: "title", created_at: now, updated_at: now }
        title_count += 1
      end
      FuzzyText.normalize_words(book.author).each do |word|
        batch << { book_id: book.id, word: word, source: "author", created_at: now, updated_at: now }
        author_count += 1
      end
      flush.call if batch.length >= 1000
    end
    flush.call if batch.any?

    BookAuthority.includes(:authority).find_each do |ba|
      FuzzyText.normalize_words(ba.authority.name).each do |word|
        batch << { book_id: ba.book_id, word: word, source: "authority_name", created_at: now, updated_at: now }
        authority_count += 1
      end
      flush.call if batch.length >= 1000
    end
    flush.call if batch.any?

    total = title_count + author_count + authority_count
    puts "  -> #{total} book_words inserted (#{title_count} from titles, #{author_count} from authors, #{authority_count} from authorities)."
  end
end
