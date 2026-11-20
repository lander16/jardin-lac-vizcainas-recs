require "json"
require "csv"
require "set"

namespace :import do
  desc "Import all data from JSON/CSV files into SQLite"
  task all: :environment do
    puts "Starting data import..."
    start_time = Time.current

    Rake::Task["import:patrons"].invoke
    Rake::Task["import:books"].invoke
    Rake::Task["import:checkouts"].invoke
    Rake::Task["import:authorities"].invoke
    Rake::Task["import:book_connections"].invoke
    Rake::Task["import:content_similarities"].invoke
    Rake::Task["import:user_similarities"].invoke
    Rake::Task["import:embeddings"].invoke
    Rake::Task["import:book_words"].invoke

    elapsed = Time.current - start_time
    puts "All data imported successfully in #{elapsed.round(2)}s!"
  end

  desc "Import patrons from patron_names.json"
  task patrons: :environment do
    file_path = Rails.root.join("data", "patron_names.json")
    unless File.exist?(file_path)
      Rails.logger.warn("import:patrons skipped — missing #{file_path}")
      puts "  ! Skipping import:patrons — missing #{file_path}"
      next
    end

    puts "Importing patrons..."
    raw = JSON.parse(File.read(file_path))
    now = Time.current

    records = raw.map do |user_id, info|
      name = info["name"].to_s
      {
        id: user_id.to_s,
        name: name,
        normalized_name: FuzzyText.normalize_text(name),
        email: info["email"],
        cardnumber: info["cardnumber"],
        checkouts_count: 0,
        created_at: now,
        updated_at: now
      }
    end

    ActiveRecord::Base.transaction do
      records.each_slice(1000) do |slice|
        Patron.upsert_all(
          slice,
          unique_by: :id,
          update_only: [ :name, :normalized_name, :email, :cardnumber, :updated_at ]
        )
      end
    end
    puts "  -> #{Patron.count} patrons imported."
  end

  desc "Import books from Koha catalog.json and enrich descriptions from book_metadata.json"
  task books: :environment do
    koha_path = Rails.root.join("data", "koha", "catalog.json")
    metadata_path = Rails.root.join("data", "book_metadata.json")

    unless File.exist?(koha_path) || File.exist?(metadata_path)
      Rails.logger.warn("import:books skipped — missing catalog.json and book_metadata.json")
      puts "  ! Skipping import:books — missing source JSON files"
      next
    end

    now = Time.current
    metadata_map = File.exist?(metadata_path) ? JSON.parse(File.read(metadata_path)) : {}
    books_map = {}

    if File.exist?(koha_path)
      JSON.parse(File.read(koha_path)).each do |info|
        bib_id = info["biblio_id"].to_s
        meta = metadata_map[bib_id] || {}
        title = info["title"].presence || meta["title"].presence || "Sin título"
        author = info["author"].presence || meta["author"].presence
        description = meta["description"].presence

        books_map[bib_id] = {
          id: bib_id,
          title: title,
          author: author,
          normalized_title: FuzzyText.normalize_text(title),
          normalized_author: FuzzyText.normalize_text(author),
          description: description,
          source: description ? "both" : "koha",
          created_at: now,
          updated_at: now
        }
      end
    else
      metadata_map.each do |book_id, info|
        bib_id = book_id.to_s
        title = info["title"].presence || "Sin título"
        author = info["author"].presence
        description = info["description"].presence

        books_map[bib_id] = {
          id: bib_id,
          title: title,
          author: author,
          normalized_title: FuzzyText.normalize_text(title),
          normalized_author: FuzzyText.normalize_text(author),
          description: description,
          source: description ? "goodreads" : "koha",
          created_at: now,
          updated_at: now
        }
      end
    end

    puts "Importing books..."
    records = books_map.values
    ActiveRecord::Base.transaction do
      records.each_slice(1000) do |slice|
        Book.upsert_all(
          slice,
          unique_by: :id,
          update_only: [ :title, :author, :normalized_title, :normalized_author, :description, :source, :updated_at ]
        )
      end
    end
    puts "  -> #{Book.count} books imported."
  end

  desc "Import checkouts from koha_checkouts.csv"
  task checkouts: :environment do
    file_path = ENV.fetch("CHECKOUTS_CSV_PATH", Rails.root.join("data", "koha_checkouts.csv"))
    unless File.exist?(file_path)
      Rails.logger.warn("import:checkouts skipped — missing #{file_path}")
      puts "  ! Skipping import:checkouts — missing #{file_path}"
      next
    end

    puts "Importing checkouts..."
    now = Time.current
    valid_patron_ids = Set.new(Patron.pluck(:id))
    valid_book_ids = Set.new(Book.pluck(:id))
    skipped = 0
    imported_count = 0

    ActiveRecord::Base.transaction do
      Checkout.where(simulated: false).delete_all

      batch = []
      flush = lambda do
        return if batch.empty?

        Checkout.insert_all(batch)
        batch.clear
      end

      CSV.foreach(file_path, headers: true) do |row|
        patron_id = row["user_id"].to_s
        book_id = row["book_id"].to_s

        unless valid_patron_ids.include?(patron_id) && valid_book_ids.include?(book_id)
          skipped += 1
          next
        end

        parsed_date = row["checkout_date"].present? ? Time.zone.parse(row["checkout_date"]) : nil
        batch << {
          patron_id: patron_id,
          book_id: book_id,
          checkout_date: parsed_date,
          simulated: false,
          created_at: now,
          updated_at: now
        }
        imported_count += 1
        flush.call if batch.size >= 1000
      end
      flush.call

      ActiveRecord::Base.connection.execute(<<~SQL)
        UPDATE patrons
        SET checkouts_count = (
          SELECT COUNT(*) FROM checkouts WHERE checkouts.patron_id = patrons.id
        )
      SQL
    end

    puts "  -> #{imported_count} historical checkouts imported (total checkouts: #{Checkout.count})."
    puts "  -> #{skipped} checkout rows skipped (missing patron/book)." if skipped.positive?
  end

  desc "Import authorities and book_authorities from Koha catalog.json"
  task authorities: :environment do
    file_path = Rails.root.join("data", "koha", "catalog.json")
    unless File.exist?(file_path)
      Rails.logger.warn("import:authorities skipped — missing #{file_path}")
      puts "  ! Skipping import:authorities — missing #{file_path}"
      next
    end

    puts "Importing authorities..."
    koha_books = JSON.parse(File.read(file_path))
    now = Time.current
    valid_book_ids = Set.new(Book.pluck(:id))

    auth_map = {}
    seen_ba = Set.new
    ba_batch = []

    type_translations = {
      "Corporativo" => "Institución / Organización",
      "Tema (Corporativo)" => "Tema (Institución)"
    }

    koha_books.each do |b|
      bib_id = b["biblio_id"].to_s
      next unless valid_book_ids.include?(bib_id)

      (b["authorities"] || []).each do |auth|
        name = auth["name"].to_s.strip
        next if name.empty?

        auth_id = auth["authority_id"].to_s
        next if auth_id.empty?

        raw_type = auth["type"].presence || "Otros"
        translated_type = type_translations[raw_type] || raw_type

        auth_map[auth_id] ||= {
          id: auth_id,
          name: name,
          authority_type: translated_type,
          marc_field: auth["marc_field"],
          books_count: 0,
          created_at: now,
          updated_at: now
        }

        ba_key = "#{bib_id}\0#{auth_id}"
        next unless seen_ba.add?(ba_key)

        ba_batch << {
          book_id: bib_id,
          authority_id: auth_id,
          created_at: now,
          updated_at: now
        }
      end
    end

    ActiveRecord::Base.transaction do
      auth_map.values.each_slice(1000) do |slice|
        Authority.upsert_all(
          slice,
          unique_by: :id,
          update_only: [ :name, :authority_type, :marc_field, :updated_at ]
        )
      end

      BookAuthority.delete_all
      ba_batch.each_slice(1000) do |slice|
        BookAuthority.insert_all(slice)
      end

      ActiveRecord::Base.connection.execute(<<~SQL)
        UPDATE authorities
        SET books_count = (
          SELECT COUNT(*) FROM book_authorities WHERE book_authorities.authority_id = authorities.id
        )
      SQL
      Authority.where(books_count: 0).delete_all
    end

    puts "  -> #{Authority.count} authorities and #{BookAuthority.count} book_authorities imported."
  end

  desc "Import book_connections from authority_graph.json"
  task book_connections: :environment do
    file_path = Rails.root.join("data", "koha", "authority_graph.json")
    unless File.exist?(file_path)
      Rails.logger.warn("import:book_connections skipped — missing #{file_path}")
      puts "  ! Skipping import:book_connections — missing #{file_path}"
      next
    end

    puts "Importing book connections..."
    data = JSON.parse(File.read(file_path))
    connections = data["connections"] || []
    now = Time.current
    valid_book_ids = Set.new(Book.pluck(:id))
    seen = Set.new

    ActiveRecord::Base.transaction do
      BookConnection.delete_all
      batch = []
      flush = lambda do
        return if batch.empty?

        BookConnection.insert_all(batch)
        batch.clear
      end

      connections.each do |c|
        src = c["source"].to_s
        tgt = c["target"].to_s
        next if src == tgt
        next unless valid_book_ids.include?(src) && valid_book_ids.include?(tgt)
        next unless seen.add?("#{src}\0#{tgt}")

        batch << {
          source_book_id: src,
          target_book_id: tgt,
          weight: [ c["weight"].to_i, 1 ].max,
          created_at: now,
          updated_at: now
        }
        flush.call if batch.size >= 1000
      end
      flush.call
    end

    puts "  -> #{BookConnection.count} book connections imported."
  end

  desc "Import content_similarities from content_similarities.json"
  task content_similarities: :environment do
    file_path = Rails.root.join("data", "content_similarities.json")
    unless File.exist?(file_path)
      Rails.logger.warn("import:content_similarities skipped — missing #{file_path}")
      puts "  ! Skipping import:content_similarities — missing #{file_path}"
      next
    end

    puts "Importing content similarities..."
    data = JSON.parse(File.read(file_path))
    now = Time.current
    valid_book_ids = Set.new(Book.pluck(:id))

    ActiveRecord::Base.transaction do
      ContentSimilarity.delete_all
      batch = []
      flush = lambda do
        return if batch.empty?

        ContentSimilarity.insert_all(batch)
        batch.clear
      end

      data.each do |book_id, sim_list|
        src = book_id.to_s
        next unless valid_book_ids.include?(src)

        seen_targets = Set.new
        sim_list.each do |item|
          tgt = item["book_id"].to_s
          next if tgt == src || !valid_book_ids.include?(tgt) || !seen_targets.add?(tgt)

          batch << {
            book_id: src,
            similar_book_id: tgt,
            similarity: item["similarity"].to_f,
            created_at: now,
            updated_at: now
          }
          flush.call if batch.size >= 1000
        end
      end
      flush.call
    end

    puts "  -> #{ContentSimilarity.count} content similarities imported."
  end

  desc "Import user_similarities from user_graph.json"
  task user_similarities: :environment do
    file_path = Rails.root.join("data", "user_graph.json")
    unless File.exist?(file_path)
      Rails.logger.warn("import:user_similarities skipped — missing #{file_path}")
      puts "  ! Skipping import:user_similarities — missing #{file_path}"
      next
    end

    puts "Importing user similarities..."
    data = JSON.parse(File.read(file_path))
    now = Time.current
    valid_patron_ids = Set.new(Patron.pluck(:id))

    ActiveRecord::Base.transaction do
      UserSimilarity.delete_all
      batch = []
      flush = lambda do
        return if batch.empty?

        UserSimilarity.insert_all(batch)
        batch.clear
      end

      data.each do |user_id, info|
        src = user_id.to_s
        next unless valid_patron_ids.include?(src)

        seen_targets = Set.new
        (info["similar_users"] || []).each do |sim|
          tgt = sim["user_id"].to_s
          next if tgt == src || !valid_patron_ids.include?(tgt) || !seen_targets.add?(tgt)

          batch << {
            patron_id: src,
            similar_patron_id: tgt,
            jaccard_score: (sim["jaccard"] || sim["similarity"] || 0.0).to_f,
            created_at: now,
            updated_at: now
          }
          flush.call if batch.size >= 1000
        end
      end
      flush.call
    end

    puts "  -> #{UserSimilarity.count} user similarities imported."
  end
end
