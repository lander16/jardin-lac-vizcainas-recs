class GraphDataService
  def self.user_graph(patron, limit: 15)
    new.user_graph(patron, limit: limit)
  end

  def self.catalog_graph(book, limit: 15)
    new.catalog_graph(book, limit: limit)
  end

  def user_graph(patron, limit: 15)
    nodes = []
    links = []
    added_nodes = Set.new

    # Target user node
    nodes << {
      id: patron.id,
      name: patron.name,
      type: "target_user",
      group: 1,
      radius: 18,
      checkouts_count: patron.checkouts.size
    }
    added_nodes << patron.id

    # User's checked out books
    patron_books = patron.books.limit(10)
    patron_books.each do |book|
      nodes << {
        id: "book_#{book.id}",
        name: book.title,
        type: "target_book",
        group: 2,
        radius: 8,
        author: book.author
      }
      added_nodes << "book_#{book.id}"

      links << {
        source: patron.id,
        target: "book_#{book.id}",
        value: 1.0,
        type: "checkout"
      }
    end

    # Similar patrons
    similar_rels = UserSimilarity.where(patron_id: patron.id)
                                 .order(jaccard_score: :desc)
                                 .limit(limit)

    similar_patron_ids = similar_rels.pluck(:similar_patron_id)
    similar_patrons = Patron.where(id: similar_patron_ids).index_by(&:id)

    similar_rels.each do |rel|
      sp = similar_patrons[rel.similar_patron_id]
      next unless sp

      unless added_nodes.include?(sp.id)
        nodes << {
          id: sp.id,
          name: sp.name,
          type: "similar_user",
          group: 3,
          radius: 12,
          jaccard: rel.jaccard_score.round(4)
        }
        added_nodes << sp.id
      end

      links << {
        source: patron.id,
        target: sp.id,
        value: rel.jaccard_score.round(4),
        type: "similarity"
      }

      # Books read by similar patron (collab books)
      sp.books.limit(3).each do |cb|
        next if patron_books.include?(cb)

        book_node_id = "collab_book_#{cb.id}"
        unless added_nodes.include?(book_node_id)
          nodes << {
            id: book_node_id,
            name: cb.title,
            type: "collab_book",
            group: 4,
            radius: 8,
            author: cb.author
          }
          added_nodes << book_node_id
        end

        links << {
          source: sp.id,
          target: book_node_id,
          value: rel.jaccard_score.round(4),
          type: "shared_checkout"
        }
      end
    end

    { nodes: nodes, links: links }
  end

  def catalog_graph(book, limit: 15)
    nodes = []
    links = []
    added_nodes = Set.new

    # Target book node
    nodes << {
      id: book.id,
      name: book.title,
      type: "target_book",
      group: 1,
      radius: 18,
      author: book.author
    }
    added_nodes << book.id

    # Book authorities
    book_authorities = book.authorities
    auth_ids = book_authorities.pluck(:id).to_set

    # Find connected books sharing authorities
    outgoing_conns = BookConnection.where(source_book_id: book.id).order(weight: :desc).limit(limit)
    incoming_conns = BookConnection.where(target_book_id: book.id).order(weight: :desc).limit(limit)

    connected_book_ids = (outgoing_conns.pluck(:target_book_id) + incoming_conns.pluck(:source_book_id)).uniq.first(limit)
    connected_books = Book.includes(:authorities).where(id: connected_book_ids).index_by(&:id)

    # Add shared authority nodes
    shared_authorities = Set.new
    connected_books.values.each do |cb|
      cb.authorities.each do |a|
        shared_authorities << a if auth_ids.include?(a.id)
      end
    end

    shared_authorities.each do |auth|
      auth_node_id = "auth_#{auth.id}"
      unless added_nodes.include?(auth_node_id)
        nodes << {
          id: auth_node_id,
          name: auth.name,
          type: "authority",
          auth_type: auth.authority_type,
          group: 2,
          radius: [ 8 + (auth.books_count * 1.5), 16 ].min
        }
        added_nodes << auth_node_id
      end

      links << {
        source: book.id,
        target: auth_node_id,
        value: 1.0,
        type: "authority_link"
      }
    end

    # Add connected book nodes
    connected_books.values.each do |cb|
      cb_node_id = "book_#{cb.id}"
      unless added_nodes.include?(cb_node_id)
        nodes << {
          id: cb_node_id,
          name: cb.title,
          type: "connected_book",
          group: 3,
          radius: 10,
          author: cb.author
        }
        added_nodes << cb_node_id
      end

      # Link connected book to its shared authorities
      cb.authorities.each do |auth|
        auth_node_id = "auth_#{auth.id}"
        next unless added_nodes.include?(auth_node_id)

        links << {
          source: cb_node_id,
          target: auth_node_id,
          value: 1.0,
          type: "shared_authority_link"
        }
      end
    end

    { nodes: nodes, links: links }
  end
end
