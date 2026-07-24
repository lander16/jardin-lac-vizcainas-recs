require "test_helper"

class CatalogControllerTest < ActionDispatch::IntegrationTest
  setup do
    @book = Book.create!(id: "cat_1", title: "Pedro Páramo", author: "Juan Rulfo")
    @authority = Authority.create!(id: "auth_1", name: "México", authority_type: "Lugar")
    BookAuthority.create!(book: @book, authority: @authority)
  end

  test "should get catalog index" do
    get catalog_url
    assert_response :success
    assert_select "h1", text: /Catálogo del Acervo/
  end

  test "should search catalog with turbo frame" do
    get catalog_search_url, params: { q: "Pedro" }
    assert_response :success
    assert_select "turbo-frame[id='catalog-results']"
  end

  test "should get catalog graph" do
    get catalog_graph_url(@book.id)
    assert_response :success
  end

  test "should get authorities by type with turbo frame" do
    get catalog_authorities_by_type_url(type: "Lugar")
    assert_response :success
    assert_select "turbo-frame[id='authority-inspector']"
  end

  test "should get authority detail with turbo frame" do
    get catalog_authority_detail_url(type: "Lugar", id: @authority.id)
    assert_response :success
    assert_select "turbo-frame[id='inspector-books-panel']"
  end
end
