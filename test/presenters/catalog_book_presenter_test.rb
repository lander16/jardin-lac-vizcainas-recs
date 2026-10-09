require "test_helper"

class CatalogBookPresenterTest < ActiveSupport::TestCase
  test "wraps a Hash with symbols" do
    hash = {
      biblio_id: "book_1",
      title: "Cien años de soledad",
      author: "Gabriel García Márquez",
      match_score: 98.5,
      match_explanation: "Coincidencia en título",
      connection_count: 5,
      authorities: [
        { name: "Macondo", type: "Lugar" },
        { name: "Novela", authority_type: "Género" }
      ]
    }

    presenter = CatalogBookPresenter.new(hash)

    assert_equal "book_1", presenter.id
    assert_equal "Cien años de soledad", presenter.title
    assert_equal "Gabriel García Márquez", presenter.author
    assert_equal 98.5, presenter.match_score
    assert_equal "Coincidencia en título", presenter.match_explanation
    assert_equal 5, presenter.connection_count
    assert_equal 2, presenter.authorities.size

    first_auth = presenter.authorities.first
    assert_equal "Macondo", first_auth.name
    assert_equal "Lugar", first_auth.authority_type
    assert_equal "Lugar", first_auth.type
    assert_equal "Macondo", first_auth[:name]
    assert_equal "Lugar", first_auth[:authority_type]
    assert_equal "Lugar", first_auth[:type]

    second_auth = presenter.authorities.second
    assert_equal "Novela", second_auth.name
    assert_equal "Género", second_auth.authority_type
  end

  test "wraps a Hash with string keys" do
    hash = {
      "biblio_id" => "book_str",
      "title" => "Ficciones",
      "author" => "Jorge Luis Borges",
      "match_score" => 85.0,
      "match_explanation" => "Coincidencia en autor",
      "connection_count" => 3,
      "authorities" => [
        { "name" => "Laberintos", "type" => "Tema" }
      ]
    }

    presenter = CatalogBookPresenter.new(hash)

    assert_equal "book_str", presenter.id
    assert_equal "Ficciones", presenter.title
    assert_equal "Jorge Luis Borges", presenter.author
    assert_equal 85.0, presenter.match_score
    assert_equal "Coincidencia en autor", presenter.match_explanation
    assert_equal 3, presenter.connection_count
    assert_equal 1, presenter.authorities.size
    assert_equal "Laberintos", presenter.authorities.first.name
    assert_equal "Tema", presenter.authorities.first.authority_type
  end

  test "wraps a Hash without connection_count using connection_counts lookup" do
    hash = { biblio_id: "book_fallback", title: "El Aleph", author: "Borges" }
    presenter = CatalogBookPresenter.new(hash, connection_counts: { "book_fallback" => 9 })

    assert_equal 9, presenter.connection_count
  end

  test "wraps a Hash without connection_count defaulting to 0" do
    hash = { biblio_id: "book_zero", title: "El Aleph", author: "Borges" }
    presenter = CatalogBookPresenter.new(hash)

    assert_equal 0, presenter.connection_count
  end

  test "wraps an ActiveRecord Book record with precomputed connection_counts" do
    book = Book.create!(id: "book_ar_1", title: "Pedro Páramo", author: "Juan Rulfo")
    authority = Authority.create!(id: "auth_ar_1", name: "Comala", authority_type: "Lugar")
    BookAuthority.create!(book: book, authority: authority)

    presenter = CatalogBookPresenter.new(book, connection_counts: { "book_ar_1" => 14 })

    assert_equal "book_ar_1", presenter.id
    assert_equal "Pedro Páramo", presenter.title
    assert_equal "Juan Rulfo", presenter.author
    assert_nil presenter.match_score
    assert_nil presenter.match_explanation
    assert_equal 14, presenter.connection_count
    assert_equal 1, presenter.authorities.size

    auth = presenter.authorities.first
    assert_equal "Comala", auth.name
    assert_equal "Lugar", auth.authority_type
    assert_equal "Comala", auth[:name]
    assert_equal "Lugar", auth[:authority_type]
  end

  test "wraps an ActiveRecord Book record falling back to association connection count" do
    book1 = Book.create!(id: "book_ar_2", title: "Rayuela", author: "Julio Cortázar")
    book2 = Book.create!(id: "book_ar_3", title: "Los premios", author: "Julio Cortázar")
    book3 = Book.create!(id: "book_ar_4", title: "Final del juego", author: "Julio Cortázar")
    BookConnection.create!(source_book: book1, target_book: book2, weight: 1)
    BookConnection.create!(source_book: book3, target_book: book1, weight: 1)

    presenter = CatalogBookPresenter.new(book1)

    assert_equal 2, presenter.connection_count
  end

  test "self.wrap maps collections of books and hashes" do
    book = Book.create!(id: "book_wrap_1", title: "La muerte de Artemio Cruz", author: "Carlos Fuentes")
    hash = { biblio_id: "book_wrap_2", title: "Aura", author: "Carlos Fuentes", connection_count: 4 }

    wrapped = CatalogBookPresenter.wrap([ book, hash ], connection_counts: { "book_wrap_1" => 7 })

    assert_equal 2, wrapped.size
    assert_instance_of CatalogBookPresenter, wrapped[0]
    assert_instance_of CatalogBookPresenter, wrapped[1]
    assert_equal 7, wrapped[0].connection_count
    assert_equal 4, wrapped[1].connection_count
  end

  test "self.wrap is idempotent on already wrapped presenters" do
    book = Book.create!(id: "book_wrap_idem", title: "Terra Nostra", author: "Carlos Fuentes")
    presenter = CatalogBookPresenter.new(book, connection_counts: { "book_wrap_idem" => 3 })

    wrapped = CatalogBookPresenter.wrap([ presenter ])

    assert_equal [ presenter ], wrapped
    assert_same presenter, wrapped.first
  end

  test "self.wrap handles empty or nil items" do
    assert_equal [], CatalogBookPresenter.wrap([])
    assert_equal [], CatalogBookPresenter.wrap(nil)
  end
end
