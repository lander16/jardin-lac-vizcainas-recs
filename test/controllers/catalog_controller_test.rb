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
end
