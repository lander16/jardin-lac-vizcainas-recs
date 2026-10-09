require "test_helper"

class RecommendationPresenterTest < ActiveSupport::TestCase
  test "wraps collections and preserves already wrapped presenters" do
    recs = [
      { book_id: "1", title: "Book 1", primary_source: "content" },
      { book_id: "2", title: "Book 2", primary_source: "collaborative" }
    ]

    wrapped = RecommendationPresenter.wrap(recs)
    assert_equal 2, wrapped.size
    assert wrapped.all? { |r| r.is_a?(RecommendationPresenter) }

    # Idempotence: wrapping already wrapped presenters
    re_wrapped = RecommendationPresenter.wrap(wrapped)
    assert_equal wrapped, re_wrapped
    assert_same wrapped.first, re_wrapped.first

    # Empty and nil collections
    assert_equal [], RecommendationPresenter.wrap([])
    assert_equal [], RecommendationPresenter.wrap(nil)
  end

  test "exposes attributes from hash with symbol keys" do
    rec = {
      book_id: "b_101",
      title: "El Aleph",
      author: "Jorge Luis Borges",
      primary_source: "content",
      match_percentage: 92,
      explanation: "Recomendado por compartir temas con Ficciones",
      score: 0.9234,
      sources: [ "content" ],
      raw_scores: { content: 0.9234, collaborative: 0.0, authority: 0.0 },
      description: "Libro de cuentos"
    }

    presenter = RecommendationPresenter.new(rec)

    assert_equal "b_101", presenter.book_id
    assert_equal "El Aleph", presenter.title
    assert_equal "Jorge Luis Borges", presenter.author
    assert_equal "content", presenter.primary_source
    assert_equal 92, presenter.match_percentage
    assert_equal "Recomendado por compartir temas con Ficciones", presenter.explanation
    assert_equal "explanation-b_101", presenter.accordion_id
    assert_equal 0.9234, presenter.score
    assert_equal [ "content" ], presenter.sources
    assert_equal({ content: 0.9234, collaborative: 0.0, authority: 0.0 }, presenter.raw_scores)
    assert_equal "Libro de cuentos", presenter.description
    assert_equal rec, presenter.item
    assert_equal rec, presenter.recommendation
    assert_equal "b_101", presenter.to_param
  end

  test "exposes attributes from hash with string keys" do
    rec = {
      "book_id" => "b_202",
      "title" => "Rayuela",
      "author" => "Julio Cortázar",
      "primary_source" => "collaborative",
      "match_percentage" => 88,
      "explanation" => "Lectores afines disfrutaron esta obra",
      "score" => 0.88,
      "sources" => [ "collaborative" ]
    }

    presenter = RecommendationPresenter.new(rec)

    assert_equal "b_202", presenter.book_id
    assert_equal "Rayuela", presenter.title
    assert_equal "Julio Cortázar", presenter.author
    assert_equal "collaborative", presenter.primary_source
    assert_equal 88, presenter.match_percentage
    assert_equal "Lectores afines disfrutaron esta obra", presenter.explanation
    assert_equal "explanation-b_202", presenter.accordion_id
  end

  test "supports bracket access and equality" do
    rec1 = { book_id: "b_303", title: "Pedro Páramo" }
    rec2 = { book_id: "b_303", title: "Pedro Páramo (Edición conmemorativa)" }
    rec3 = { book_id: "b_304", title: "El llano en llamas" }

    presenter1 = RecommendationPresenter.new(rec1)
    presenter2 = RecommendationPresenter.new(rec2)
    presenter3 = RecommendationPresenter.new(rec3)

    assert_equal "Pedro Páramo", presenter1[:title]
    assert_equal "Pedro Páramo", presenter1["title"]
    assert_equal "b_303", presenter1[:book_id]

    assert_equal presenter1, presenter2
    assert presenter1.eql?(presenter2)
    assert_equal presenter1.hash, presenter2.hash
    assert_not_equal presenter1, presenter3
  end

  test "badge helpers for content source" do
    presenter = RecommendationPresenter.new(primary_source: "content")

    assert_equal "content", presenter.badge_class
    assert_equal "Contenido", presenter.badge_text
    assert_equal "fa-solid fa-book", presenter.badge_icon
  end

  test "badge helpers for collaborative source" do
    presenter = RecommendationPresenter.new(primary_source: "collaborative")

    assert_equal "collaborative", presenter.badge_class
    assert_equal "Lectores Afines", presenter.badge_text
    assert_equal "fa-solid fa-users", presenter.badge_icon
  end

  test "badge helpers for authority source" do
    presenter = RecommendationPresenter.new(primary_source: "authority")

    assert_equal "authority", presenter.badge_class
    assert_equal "Autoridades", presenter.badge_text
    assert_equal "fa-solid fa-tags", presenter.badge_icon
  end

  test "badge helpers for all source" do
    presenter = RecommendationPresenter.new(primary_source: "all")

    assert_equal "hybrid", presenter.badge_class
    assert_equal "Híbrido", presenter.badge_text
    assert_equal "fa-solid fa-wand-magic-sparkles", presenter.badge_icon
  end

  test "badge helpers for other sources fallback to hybrid and Combinado" do
    [ "multiple", "other", "", nil ].each do |source|
      presenter = RecommendationPresenter.new(primary_source: source)

      assert_equal "hybrid", presenter.badge_class, "Expected hybrid badge_class for #{source.inspect}"
      assert_equal "Combinado", presenter.badge_text, "Expected Combinado badge_text for #{source.inspect}"
      assert_equal "fa-solid fa-layer-group", presenter.badge_icon, "Expected layer-group badge_icon for #{source.inspect}"
    end
  end
end
