namespace :import do
  desc "Build a per-word index of titles, authors, and authority names for fuzzy search"
  task book_words: :environment do
    puts "Importing book words..."
    now = Time.current

    ActiveRecord::Base.transaction do
      BookWord.delete_all

      batch = []
      flush = lambda do
        return if batch.empty?

        BookWord.insert_all(batch, unique_by: [ :book_id, :word, :source ])
        batch.clear
      end

      Book.select(:id, :title, :author).find_each do |book|
        FuzzyText.normalize_words(book.title).each do |word|
          batch << { book_id: book.id, word: word, source: "title", created_at: now, updated_at: now }
        end
        FuzzyText.normalize_words(book.author).each do |word|
          batch << { book_id: book.id, word: word, source: "author", created_at: now, updated_at: now }
        end
        flush.call if batch.length >= 1000
      end
      flush.call

      BookAuthority.includes(:authority).find_each do |ba|
        next unless ba.authority

        FuzzyText.normalize_words(ba.authority.name).each do |word|
          batch << { book_id: ba.book_id, word: word, source: "authority_name", created_at: now, updated_at: now }
        end
        flush.call if batch.length >= 1000
      end
      flush.call

      FuzzyBookLookup.rebuild_from_book_words!
    end

    fts_count = ActiveRecord::Base.connection.select_value("SELECT COUNT(*) FROM book_words_fts").to_i
    puts "  -> #{BookWord.count} book_words and #{fts_count} book_words_fts rows populated."
  end
end
