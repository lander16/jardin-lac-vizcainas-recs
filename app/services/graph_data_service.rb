# frozen_string_literal: true

require "set"

class GraphDataService
  def self.user_graph(patron, limit: 15)
    new.user_graph(patron, limit: limit)
  end

  def self.catalog_graph(book, limit: 15)
    new.catalog_graph(book, limit: limit)
  end

  def user_graph(patron, limit: 15)
    limit = (limit || 15).to_i.clamp(1, 50)
    nodes = []
    links = []
    added_nodes = Set.new
    added_links = Set.new

    all_patron_book_ids = patron.checkouts.distinct.pluck(:book_id).to_set
    patron_books = patron.books.select(:id, :title, :author).distinct.limit(10).to_a

    nodes << {
      id: patron.id,
      patron_id: patron.id,
      name: patron.name,
      type: "target_user",
      group: 1,
      radius: 18,
      checkouts_count: [ patron.checkouts_count, all_patron_book_ids.size ].max
    }
    added_nodes << patron.id

    patron_books.each do |book|
      book_node_id = "book_#{book.id}"
      if added_nodes.add?(book_node_id)
        nodes << {
          id: book_node_id,
          book_id: book.id,
          name: book.title,
          type: "target_book",
          group: 2,
          radius: 8,
          author: book.author
        }
      end

      add_link(links, added_links, source: patron.id, target: book_node_id, value: 1.0, type: "checkout")
    end

    similar_rels = UserSimilarity.where(patron_id: patron.id)
                                 .where.not(similar_patron_id: patron.id)
                                 .order(jaccard_score: :desc)
                                 .limit(limit)
                                 .to_a
    return { nodes: nodes, links: links } if similar_rels.empty?

    similar_patron_ids = similar_rels.map(&:similar_patron_id)
    similar_patrons = Patron.select(:id, :name).where(id: similar_patron_ids).index_by(&:id)

    peer_checkouts_scope = Checkout.where(patron_id: similar_patron_ids)
    peer_checkouts_scope = peer_checkouts_scope.where.not(book_id: all_patron_book_ids.to_a) if all_patron_book_ids.any?

    peer_book_ids_by_patron = Hash.new { |h, k| h[k] = [] }
    peer_checkouts_scope.distinct.pluck(:patron_id, :book_id).each do |pid, bid|
      peer_book_ids_by_patron[pid] << bid
    end

    selected_books_by_patron = {}
    all_collab_book_ids = Set.new
    similar_rels.each do |rel|
      top_ids = peer_book_ids_by_patron[rel.similar_patron_id].first(3)
      selected_books_by_patron[rel.similar_patron_id] = top_ids
      all_collab_book_ids.merge(top_ids)
    end

    collab_books_by_id = if all_collab_book_ids.any?
                           Book.select(:id, :title, :author).where(id: all_collab_book_ids.to_a).index_by(&:id)
    else
                           {}
    end

    similar_rels.each do |rel|
      sp = similar_patrons[rel.similar_patron_id]
      next unless sp

      jaccard = rel.jaccard_score.round(4)
      if added_nodes.add?(sp.id)
        nodes << {
          id: sp.id,
          patron_id: sp.id,
          name: sp.name,
          type: "similar_user",
          group: 3,
          radius: 12,
          jaccard: jaccard
        }
      end

      add_link(links, added_links, source: patron.id, target: sp.id, value: jaccard, type: "similarity")

      selected_books_by_patron[sp.id].each do |cb_id|
        cb = collab_books_by_id[cb_id]
        next unless cb

        book_node_id = "collab_book_#{cb.id}"
        if added_nodes.add?(book_node_id)
          nodes << {
            id: book_node_id,
            book_id: cb.id,
            name: cb.title,
            type: "collab_book",
            group: 4,
            radius: 8,
            author: cb.author
          }
        end

        add_link(links, added_links, source: sp.id, target: book_node_id, value: jaccard, type: "shared_checkout")
      end
    end

    { nodes: nodes, links: links }
  end

  def catalog_graph(book, limit: 15)
    limit = (limit || 15).to_i.clamp(1, 50)
    nodes = []
    links = []
    added_nodes = Set.new
    added_links = Set.new

    nodes << {
      id: book.id,
      book_id: book.id,
      name: book.title,
      type: "target_book",
      group: 1,
      radius: 18,
      author: book.author
    }
    added_nodes << book.id

    auth_ids = book.authorities.pluck(:id).to_set
    return { nodes: nodes, links: links } if auth_ids.empty?

    weights_by_neighbor = {}
    BookConnection.where(source_book_id: book.id).pluck(:target_book_id, :weight).each do |neighbor_id, weight|
      next if neighbor_id == book.id

      weights_by_neighbor[neighbor_id] = [ weights_by_neighbor[neighbor_id] || 0, weight ].max
    end
    BookConnection.where(target_book_id: book.id).pluck(:source_book_id, :weight).each do |neighbor_id, weight|
      next if neighbor_id == book.id

      weights_by_neighbor[neighbor_id] = [ weights_by_neighbor[neighbor_id] || 0, weight ].max
    end

    connected_book_ids = weights_by_neighbor.sort_by { |id, w| [ -w, id ] }.first(limit).map(&:first)
    return { nodes: nodes, links: links } if connected_book_ids.empty?

    connected_books = Book.select(:id, :title, :author)
                          .includes(:authorities)
                          .where(id: connected_book_ids)
                          .index_by(&:id)

    connected_book_ids.each do |cb_id|
      cb = connected_books[cb_id]
      next unless cb

      shared_auths = cb.authorities.select { |a| auth_ids.include?(a.id) }
      next if shared_auths.empty?

      shared_auths.each do |auth|
        auth_node_id = "auth_#{auth.id}"
        if added_nodes.add?(auth_node_id)
          nodes << {
            id: auth_node_id,
            authority_id: auth.id,
            name: auth.name,
            type: "authority",
            auth_type: auth.authority_type,
            group: 2,
            radius: [ (8.0 + (Math.log2(auth.books_count + 1) * 1.4)).round(1), 18.0 ].min
          }
        end

        add_link(links, added_links, source: book.id, target: auth_node_id, value: 1.0, type: "authority_link")
      end

      cb_node_id = "book_#{cb.id}"
      if added_nodes.add?(cb_node_id)
        nodes << {
          id: cb_node_id,
          book_id: cb.id,
          name: cb.title,
          type: "connected_book",
          group: 3,
          radius: 10,
          author: cb.author
        }
      end

      shared_auths.each do |auth|
        add_link(links, added_links, source: cb_node_id, target: "auth_#{auth.id}", value: 1.0, type: "shared_authority_link")
      end
    end

    { nodes: nodes, links: links }
  end

  private

  def add_link(links, added_links, source:, target:, value:, type:)
    key = [ source, target, type ]
    return unless added_links.add?(key)

    links << { source: source, target: target, value: value, type: type }
  end
end
