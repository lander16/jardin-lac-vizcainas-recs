# frozen_string_literal: true

require "test_helper"
require "tmpdir"
require "fileutils"

class QueryEmbedderTest < ActiveSupport::TestCase
  setup do
    QueryEmbedder.reset!
  end

  teardown do
    QueryEmbedder.reset!
  end

  # Override `available?` on the memoized instance to exercise `encode`'s early return.
  def with_unavailable_instance
    original = QueryEmbedder.default.method(:available?)
    QueryEmbedder.default.define_singleton_method(:available?) { false }
    yield
  ensure
    QueryEmbedder.default.define_singleton_method(:available?, original)
  end

  def with_model_dir(path)
    original_dir = QueryEmbedder::MODEL_DIR
    QueryEmbedder.send(:remove_const, :MODEL_DIR)
    QueryEmbedder.const_set(:MODEL_DIR, Pathname.new(path))
    QueryEmbedder.reset!
    yield
  ensure
    QueryEmbedder.send(:remove_const, :MODEL_DIR)
    QueryEmbedder.const_set(:MODEL_DIR, original_dir)
    QueryEmbedder.reset!
  end

  test "available? is false and encode returns nil when model files are missing" do
    Dir.mktmpdir do |tmpdir|
      with_model_dir(tmpdir) do
        assert_not QueryEmbedder.default.available?
        assert_nil QueryEmbedder.default.encode("soledad")

        FileUtils.touch(File.join(tmpdir, "tokenizer.json"))
        QueryEmbedder.reset!
        assert_not QueryEmbedder.default.available?
      end
    end
  end

  test "falls back to model.onnx when model_quantized.onnx is absent and prefers quantized when present" do
    Dir.mktmpdir do |tmpdir|
      root = Pathname.new(tmpdir)
      FileUtils.touch(root.join("tokenizer.json"))
      FileUtils.touch(root.join("model.onnx"))

      with_model_dir(root) do
        assert QueryEmbedder.default.available?
        assert_equal root.join("model.onnx"), QueryEmbedder.default.send(:model_file)

        FileUtils.touch(root.join("model_quantized.onnx"))
        QueryEmbedder.reset!
        assert QueryEmbedder.default.available?
        assert_equal root.join("model_quantized.onnx"), QueryEmbedder.default.send(:model_file)
      end
    end
  end

  test "encode returns nil when the model is unavailable" do
    with_unavailable_instance do
      assert_nil QueryEmbedder.default.encode("anything")
    end
  end

  test "encode returns nil for blank text" do
    assert_nil QueryEmbedder.default.encode("")
    assert_nil QueryEmbedder.default.encode(nil)
  end

  test "encode returns a 384-dim unit-normalized vector when the model is loaded" do
    skip "ONNX artefacts missing" unless QueryEmbedder.default.available?

    vector = QueryEmbedder.default.encode("soledad existencial")

    assert_not_nil vector
    assert_equal QueryEmbedder::DIMENSION, vector.length
    norm = Math.sqrt(vector.sum { |v| v * v })
    assert_in_delta 1.0, norm, 1e-6, "vector should be L2-normalized"
  end
end
