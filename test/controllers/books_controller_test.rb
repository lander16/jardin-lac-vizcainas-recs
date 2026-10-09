require "test_helper"

class BooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @book = Book.create!(id: "book_test_1", title: "Cien años de soledad", author: "Gabriel García Márquez", description: "Realismo mágico")
    @patron = Patron.create!(id: "patron_test_1", name: "Aurelio Buendía")
    Checkout.create!(book: @book, patron: @patron, checkout_date: Time.current)
  end

  test "should get show with basic book info and checkout history" do
    get book_url(@book)

    assert_response :success
    assert_select "h1", text: @book.title
    assert_select ".glass-card", text: /Aurelio Buendía/
  end

  test "should get show with vector-based similar books" do
    similar = Book.create!(id: "book_test_2", title: "El amor en los tiempos del cólera", author: "Gabriel García Márquez")
    ContentSimilarity.create!(book: @book, similar_book: similar, similarity: 0.85)

    get book_url(@book)

    assert_response :success
    assert_match(/85% afinidad/, response.body)
    assert_match similar.title, response.body
  end

  test "should get show with shared authorities fallback when vector similarity is absent" do
    similar = Book.create!(id: "book_test_3", title: "La hojarasca", author: "Gabriel García Márquez")
    authority = Authority.create!(id: "auth_test_1", name: "Macondo", authority_type: "Tema")
    BookAuthority.create!(book: @book, authority: authority)
    BookAuthority.create!(book: similar, authority: authority)

    get book_url(@book)

    assert_response :success
    assert_match similar.title, response.body
    assert_match(/afinidad/, response.body)
  end

  test "should get show with empty similar books when no similar books exist" do
    get book_url(@book)

    assert_response :success
    assert_match(/No se encontraron obras similares/, response.body)
  end
end
