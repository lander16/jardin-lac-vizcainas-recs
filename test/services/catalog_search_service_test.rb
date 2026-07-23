require "test_helper"

class CatalogSearchServiceTest < ActiveSupport::TestCase
  setup do
    @book1 = Book.create!(id: "b10", title: "Siddhartha", author: "Hermann Hesse")
    @book2 = Book.create!(id: "b11", title: "Demian", author: "Hermann Hesse")
    @book3 = Book.create!(id: "b12", title: "Pedro Páramo", author: "Juan Rulfo")
  end

  test "fuzzy search finds books by author" do
    results = CatalogSearchService.search("Hesse")
    assert_not_empty results
    titles = results.map { |r| r[:title] }
    assert_includes titles, "Siddhartha"
    assert_includes titles, "Demian"
  end

  test "search returns empty for blank query" do
    assert_empty CatalogSearchService.search("")
  end
end
