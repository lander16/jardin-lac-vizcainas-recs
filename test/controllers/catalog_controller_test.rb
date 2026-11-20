require "test_helper"

class CatalogControllerTest < ActionDispatch::IntegrationTest
  setup do
    @book = Book.create!(id: "cat_1", title: "Pedro Páramo", author: "Juan Rulfo")
    @authority = Authority.create!(id: "auth_1", name: "México", authority_type: "Lugar")
    BookAuthority.create!(book: @book, authority: @authority)
  end

  # Build a fake embedder that responds to .available? and .encode.
  def fake_embedder(available:, vector: nil)
    fake = Object.new
    fake.instance_variable_set(:@available, available)
    fake.instance_variable_set(:@vector, vector)
    fake.define_singleton_method(:available?) { @available }
    fake.define_singleton_method(:encode) { |_t| @vector }
    fake
  end

  test "should get catalog index" do
    get catalog_url
    assert_response :success
    assert_select "h1", text: /Catálogo del Acervo/
  end

  test "catalog index popular books counts outgoing-only connections" do
    connected = Book.create!(id: "cat_2", title: "El Llano en llamas", author: "Juan Rulfo")
    BookConnection.create!(source_book: @book, target_book: connected, weight: 1)

    get catalog_url

    assert_response :success
    assert_match @book.title, response.body
    assert_match(/1\s+con\./, response.body)
  end

  test "should not show the semantic pill when the ONNX model is unavailable" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      get catalog_url
      assert_response :success
      assert_select ".semantic-pill", false, "Semantic pill should be hidden when the embedder is not available"
    end
  end

  test "should show the semantic pill when the ONNX model is available" do
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: true)) do
      get catalog_url
      assert_response :success
      assert_select ".semantic-pill", true
      assert_select ".semantic-pill", /Búsqueda semántica activa/
    end
  end

  test "should search catalog with turbo frame" do
    get catalog_search_url, params: { q: "Pedro" }
    assert_response :success
    assert_select "turbo-frame[id='catalog-results']"
  end

  test "search results include a semantic explanation when relevant" do
    query_vec = Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }
    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: true, vector: query_vec)) do
      @book.update!(
        embedding: Array.new(QueryEmbedder::DIMENSION, 0.0).tap { |v| v[0] = 1.0 }.pack("e*"),
        embedding_model: "test",
      )

      get catalog_search_url, params: { q: "Pedro" }
      assert_response :success
      assert_match(/Coincidencia semántica/, response.body)
    end
  end

  test "catalog index wraps books as CatalogBookPresenter" do
    get catalog_url
    assert_response :success
    books = @controller.instance_variable_get(:@books)
    assert books.present?
    assert books.all? { |b| b.is_a?(CatalogBookPresenter) }
  end

  test "search wraps books as CatalogBookPresenter when query is empty" do
    get catalog_search_url
    assert_response :success
    books = @controller.instance_variable_get(:@books)
    assert books.present?
    assert books.all? { |b| b.is_a?(CatalogBookPresenter) }
  end

  test "search wraps books as CatalogBookPresenter when query is present" do
    get catalog_search_url, params: { q: "Pedro" }
    assert_response :success
    books = @controller.instance_variable_get(:@books)
    assert books.present?
    assert books.all? { |b| b.is_a?(CatalogBookPresenter) }
  end

  test "authorities_by_type supports slashes in query param" do
    inst_auth = Authority.create!(
      id: "auth_inst_1",
      name: "Colegio de las Vizcaínas",
      authority_type: "Institución / Organización",
      books_count: 3
    )

    get catalog_authorities_by_type_url, params: { type: "Institución / Organización" }

    assert_response :success
    assert_select "turbo-frame[id='authority-inspector']"
    assert_select "#authority-inspector-title", text: "Institución / Organización"
    assert_match inst_auth.name, response.body
    assert_no_match @authority.name, response.body
  end

  test "catalog index filters by q param" do
    other_book = Book.create!(id: "cat_other", title: "Don Quijote", author: "Miguel de Cervantes")

    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      get catalog_url, params: { q: "Pedro" }
    end

    assert_response :success
    assert_select "#catalog-results [data-search-result-item]", count: 1
    assert_match @book.title, response.body
    assert_no_match other_book.title, response.body
  end

  test "catalog search filters by q param and honors limit param" do
    Book.create!(id: "cat_pedro_2", title: "Pedro y el lobo", author: "Sergei Prokofiev")
    other_book = Book.create!(id: "cat_quijote", title: "Don Quijote", author: "Miguel de Cervantes")

    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      get catalog_search_url, params: { q: "Pedro" }
      assert_response :success
      assert_select "[data-search-result-item]", count: 2
      assert_match @book.title, response.body
      assert_no_match other_book.title, response.body

      get catalog_search_url, params: { q: "Pedro", limit: 1 }
      assert_response :success
      assert_select "[data-search-result-item]", count: 1
    end
  end

  test "catalog search defaults safely when limit param is invalid" do
    Book.create!(id: "cat_extra_1", title: "Aura", author: "Carlos Fuentes")
    Book.create!(id: "cat_extra_2", title: "El llano en llamas", author: "Juan Rulfo")

    with_stubbed_class_method(QueryEmbedder, :default, fake_embedder(available: false)) do
      get catalog_search_url, params: { limit: "abc" }
    end

    assert_response :success
    assert_select "[data-search-result-item]", count: 3
  end

  test "catalog renders authority dialog inside modal controller without inline JS handlers" do
    get catalog_url

    assert_response :success
    assert_select '[data-controller="modal"] dialog#authority-inspector-modal', count: 1
    assert_select "dialog", count: 1
    assert_select "[onclick], [onchange], [oninput], [onsubmit], [onmouseover], [onmouseout]", count: 0
    assert_no_match(/\s+on(?:click|change|input|submit|mouseover|mouseout)\s*=/i, response.body)
  end
end
