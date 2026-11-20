# frozen_string_literal: true

require "test_helper"
require "rake"
require "tmpdir"
require "json"
require "fileutils"

class ImportCatalogTasksTest < ActiveSupport::TestCase
  TASKS = %w[import:patrons import:books import:authorities import:embeddings].freeze

  setup do
    Rails.application.load_tasks unless Rake::Task.task_defined?("import:patrons")
    # Ensure constants are loaded before Rails.root is temporarily stubbed.
    Patron
    Book
    Authority
    BookAuthority
    FuzzyText
    QueryEmbedder
  end

  teardown do
    TASKS.each { |name| Rake::Task[name].reenable }
  end

  test "import:patrons imports patrons with normalized_name and updates existing records" do
    Patron.create!(id: "p1", name: "Nombre Anterior", email: "old@test.com", cardnumber: "000")

    with_temp_data_root do |root|
      payload = {
        "p1" => { "name" => "María José Álvarez", "email" => "maria@test.com", "cardnumber" => "C001" },
        "p2" => { "name" => "Juan Pérez", "email" => "juan@test.com", "cardnumber" => "C002" }
      }
      File.write(root.join("data", "patron_names.json"), JSON.generate(payload))

      invoke_task("import:patrons")
    end

    p1 = Patron.find("p1")
    p2 = Patron.find("p2")
    assert_equal "María José Álvarez", p1.name
    assert_equal "maria jose alvarez", p1.normalized_name
    assert_equal "maria@test.com", p1.email
    assert_equal "C001", p1.cardnumber
    assert_equal "juan perez", p2.normalized_name
  end

  test "import:books sets source both vs koha and populates normalized_title and normalized_author" do
    with_temp_data_root do |root|
      catalog = [
        { "biblio_id" => "b_both", "title" => "Cien años de soledad", "author" => "García Márquez, Gabriel" },
        { "biblio_id" => "b_koha", "title" => "Pedro Páramo", "author" => "Rulfo, Juan" }
      ]
      metadata = {
        "b_both" => { "description" => "Novela sobre Macondo" },
        "b_koha" => { "description" => "" }
      }
      File.write(root.join("data", "koha", "catalog.json"), JSON.generate(catalog))
      File.write(root.join("data", "book_metadata.json"), JSON.generate(metadata))

      invoke_task("import:books")
    end

    both = Book.find("b_both")
    koha = Book.find("b_koha")

    assert_equal "both", both.source
    assert_equal "Novela sobre Macondo", both.description
    assert_equal "cien anos de soledad", both.normalized_title
    assert_equal "garcia marquez gabriel", both.normalized_author

    assert_equal "koha", koha.source
    assert_nil koha.description
    assert_equal "pedro paramo", koha.normalized_title
    assert_equal "rulfo juan", koha.normalized_author
  end

  test "import:authorities skips blank authority names and prunes orphan authorities" do
    Book.create!(id: "b_auth", title: "Libro de prueba")
    Authority.create!(id: "auth_orphan", name: "Autoridad Huérfana", authority_type: "Tema", books_count: 1)

    with_temp_data_root do |root|
      catalog = [
        {
          "biblio_id" => "b_auth",
          "title" => "Libro de prueba",
          "authorities" => [
            { "authority_id" => "auth_valid", "name" => "Realismo mágico", "type" => "Tema", "marc_field" => "650" },
            { "authority_id" => "auth_blank", "name" => "   ", "type" => "Tema", "marc_field" => "650" },
            { "authority_id" => "auth_corp", "name" => "UNAM", "type" => "Corporativo", "marc_field" => "610" }
          ]
        }
      ]
      File.write(root.join("data", "koha", "catalog.json"), JSON.generate(catalog))

      invoke_task("import:authorities")
    end

    assert Authority.exists?("auth_valid")
    assert_equal 1, Authority.find("auth_valid").books_count
    assert_equal "Institución / Organización", Authority.find("auth_corp").authority_type
    assert_not Authority.exists?("auth_blank")
    assert_not Authority.exists?("auth_orphan")
    assert_equal 2, BookAuthority.where(book_id: "b_auth").count
  end

  test "import:embeddings imports vectors and clears stale embeddings missing from embeddings_index.json" do
    Book.create!(id: "b_fresh", title: "Fresh Book")
    stale_blob = Array.new(QueryEmbedder::DIMENSION, 0.2).pack("e*")
    Book.create!(id: "b_stale", title: "Stale Book", embedding: stale_blob, embedding_model: "old-model")

    vector = Array.new(QueryEmbedder::DIMENSION, 0.0).tap do |v|
      v[0] = 0.5
      v[1] = 0.25
    end

    with_temp_data_root do |root|
      index = {
        "model" => "test-minilm",
        "dim" => QueryEmbedder::DIMENSION,
        "book_ids" => [ "b_fresh" ]
      }
      File.write(root.join("data", "embeddings_index.json"), JSON.generate(index))
      File.binwrite(root.join("data", "embeddings.bin"), vector.pack("e*"))

      invoke_task("import:embeddings")
    end

    fresh = Book.find("b_fresh")
    stale = Book.find("b_stale")

    assert_not_nil fresh.embedding
    assert_equal "test-minilm", fresh.embedding_model
    unpacked = fresh.embedding.unpack("e*")
    assert_equal QueryEmbedder::DIMENSION, unpacked.length
    assert_in_delta 0.5, unpacked[0], 1e-6
    assert_in_delta 0.25, unpacked[1], 1e-6

    assert_nil stale.embedding
    assert_nil stale.embedding_model
  end

  test "import tasks skip cleanly when source files are missing" do
    with_temp_data_root do
      TASKS.each do |name|
        assert_nothing_raised { invoke_task(name) }
      end
    end
  end

  private

  def invoke_task(name)
    task = Rake::Task[name]
    task.reenable
    task.invoke
  end

  def with_temp_data_root
    Dir.mktmpdir do |tmpdir|
      root = Pathname.new(tmpdir)
      FileUtils.mkdir_p(root.join("data", "koha"))
      with_stubbed_class_method(Rails, :root, root) do
        yield root
      end
    end
  end
end
