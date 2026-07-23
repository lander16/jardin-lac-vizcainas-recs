require "json"
require "csv"

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

    elapsed = Time.current - start_time
    puts "All data imported successfully in #{elapsed.round(2)}s!"
  end

  desc "Import patrons from patron_names.json"
  task patrons: :environment do
    file_path = Rails.root.join("data", "patron_names.json")
    next unless File.exist?(file_path)

    puts "Importing patrons..."
    raw = JSON.parse(File.read(file_path))
    now = Time.current

    records = raw.map do |user_id, info|
      {
        id: user_id,
        name: info["name"],
        email: info["email"],
        cardnumber: info["cardnumber"],
        checkouts_count: 0,
        created_at: now,
        updated_at: now
      }
    end

    Patron.insert_all(records) unless records.empty?
    puts "  -> #{Patron.count} patrons imported."
  end

  desc "Import books from book_metadata.json and Koha catalog.json"
  task books: :environment do
    koha_path = Rails.root.join("data", "koha", "catalog.json")
    gr_path = Rails.root.join("data", "book_metadata.json")
    now = Time.current
    books_map = {}

    if File.exist?(gr_path)
      gr_books = JSON.parse(File.read(gr_path))
      gr_books.each do |book_id, info|
        books_map[book_id.to_s] = {
          id: book_id.to_s,
          title: info["title"] || "Sin título",
          description: info["description"],
          author: info["author"],
          source: "goodreads",
          created_at: now,
          updated_at: now
        }
      end
    end

    if File.exist?(koha_path)
      koha_books = JSON.parse(File.read(koha_path))
      koha_books.each do |info|
        bib_id = info["biblio_id"].to_s
        existing = books_map[bib_id]

        if existing
          existing[:title] = info["title"] if info["title"].present? && existing[:title].to_s.start_with?("Book ", "book ")
          existing[:author] = info["author"] if info["author"].present?
          existing[:source] = "both"
        else
          books_map[bib_id] = {
            id: bib_id,
            title: info["title"] || "Sin título",
            description: nil,
            author: info["author"],
            source: "koha",
            created_at: now,
            updated_at: now
          }
        end
      end
    end

    puts "Importing books..."
    records = books_map.values
    records.each_slice(1000) do |slice|
      Book.insert_all(slice)
    end
    puts "  -> #{Book.count} books imported."
  end

  desc "Import checkouts from koha_checkouts.csv"
  task checkouts: :environment do
    file_path = Rails.root.join("data", "koha_checkouts.csv")
    next unless File.exist?(file_path)

    puts "Importing checkouts..."
    now = Time.current
    records = []
    
    CSV.foreach(file_path, headers: true) do |row|
      records << {
        patron_id: row["user_id"],
        book_id: row["book_id"],
        checkout_date: row["checkout_date"] ? Time.zone.parse(row["checkout_date"]) : now,
        simulated: false,
        created_at: now,
        updated_at: now
      }
    end

    records.each_slice(1000) do |slice|
      Checkout.insert_all(slice)
    end

    # Update counter cache for patrons
    Patron.find_each do |patron|
      patron.update_columns(checkouts_count: patron.checkouts.count)
    end

    puts "  -> #{Checkout.count} checkouts imported."
  end

  desc "Import authorities and book_authorities from Koha catalog.json"
  task authorities: :environment do
    file_path = Rails.root.join("data", "koha", "catalog.json")
    next unless File.exist?(file_path)

    puts "Importing authorities..."
    koha_books = JSON.parse(File.read(file_path))
    now = Time.current

    auth_map = {}
    book_auth_records = []

    type_translations = {
      "Corporativo" => "Institución / Organización",
      "Tema (Corporativo)" => "Tema (Institución)"
    }

    koha_books.each do |b|
      bib_id = b["biblio_id"].to_s
      next unless Book.exists?(id: bib_id)

      (b["authorities"] || []).each do |auth|
        auth_id = auth["authority_id"].to_s
        raw_type = auth["type"] || "Otros"
        translated_type = type_translations[raw_type] || raw_type

        auth_map[auth_id] ||= {
          id: auth_id,
          name: auth["name"],
          authority_type: translated_type,
          marc_field: auth["marc_field"],
          books_count: 0,
          created_at: now,
          updated_at: now
        }

        book_auth_records << {
          book_id: bib_id,
          authority_id: auth_id,
          created_at: now,
          updated_at: now
        }
      end
    end

    auth_records = auth_map.values
    auth_records.each_slice(1000) do |slice|
      Authority.insert_all(slice)
    end

    # Deduplicate book_authorities by [book_id, authority_id]
    unique_ba = book_auth_records.uniq { |r| [r[:book_id], r[:authority_id]] }
    unique_ba.each_slice(1000) do |slice|
      BookAuthority.insert_all(slice)
    end

    # Update counter cache for authorities
    Authority.find_each do |auth|
      auth.update_columns(books_count: auth.book_authorities.count)
    end

    puts "  -> #{Authority.count} authorities and #{BookAuthority.count} book_authorities imported."
  end

  desc "Import book_connections from authority_graph.json"
  task book_connections: :environment do
    file_path = Rails.root.join("data", "koha", "authority_graph.json")
    next unless File.exist?(file_path)

    puts "Importing book connections..."
    data = JSON.parse(File.read(file_path))
    connections = data["connections"] || []
    now = Time.current
    records = []

    valid_book_ids = Set.new(Book.pluck(:id))

    connections.each do |c|
      src = c["source"].to_s
      tgt = c["target"].to_s
      weight = c["weight"].to_i

      if valid_book_ids.include?(src) && valid_book_ids.include?(tgt)
        records << {
          source_book_id: src,
          target_book_id: tgt,
          weight: weight,
          created_at: now,
          updated_at: now
        }
      end
    end

    records.uniq! { |r| [r[:source_book_id], r[:target_book_id]] }

    records.each_slice(1000) do |slice|
      BookConnection.insert_all(slice)
    end

    puts "  -> #{BookConnection.count} book connections imported."
  end

  desc "Import content_similarities from content_similarities.json"
  task content_similarities: :environment do
    file_path = Rails.root.join("data", "content_similarities.json")
    next unless File.exist?(file_path)

    puts "Importing content similarities..."
    data = JSON.parse(File.read(file_path))
    now = Time.current
    records = []

    valid_book_ids = Set.new(Book.pluck(:id))

    data.each do |book_id, sim_list|
      src = book_id.to_s
      next unless valid_book_ids.include?(src)

      sim_list.each do |item|
        tgt = item["book_id"].to_s
        sim = item["similarity"].to_f

        if valid_book_ids.include?(tgt)
          records << {
            book_id: src,
            similar_book_id: tgt,
            similarity: sim,
            created_at: now,
            updated_at: now
          }
        end
      end
    end

    records.uniq! { |r| [r[:book_id], r[:similar_book_id]] }

    records.each_slice(1000) do |slice|
      ContentSimilarity.insert_all(slice)
    end

    puts "  -> #{ContentSimilarity.count} content similarities imported."
  end

  desc "Import user_similarities from user_graph.json"
  task user_similarities: :environment do
    file_path = Rails.root.join("data", "user_graph.json")
    next unless File.exist?(file_path)

    puts "Importing user similarities..."
    data = JSON.parse(File.read(file_path))
    now = Time.current
    records = []

    valid_patron_ids = Set.new(Patron.pluck(:id))

    data.each do |user_id, info|
      src = user_id.to_s
      next unless valid_patron_ids.include?(src)

      (info["similar_users"] || []).each do |sim|
        tgt = sim["user_id"].to_s
        score = (sim["jaccard"] || sim["similarity"] || 0.0).to_f

        if valid_patron_ids.include?(tgt)
          records << {
            patron_id: src,
            similar_patron_id: tgt,
            jaccard_score: score,
            created_at: now,
            updated_at: now
          }
        end
      end
    end

    records.uniq! { |r| [r[:patron_id], r[:similar_patron_id]] }

    records.each_slice(1000) do |slice|
      UserSimilarity.insert_all(slice)
    end

    puts "  -> #{UserSimilarity.count} user similarities imported."
  end
end
