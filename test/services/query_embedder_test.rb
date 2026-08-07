require "test_helper"

class QueryEmbedderTest < ActiveSupport::TestCase
  setup do
    QueryEmbedder.reset!
  end

  # Override the `available?` method on the real (memoised) instance
  # for the duration of a block, so the real encode#encode's
  # early-return is exercised.
  def with_unavailable_instance
    original = QueryEmbedder.default.method(:available?)
    QueryEmbedder.default.define_singleton_method(:available?) { false }
    yield
  ensure
    QueryEmbedder.default.define_singleton_method(:available?, original)
  end

  test "encode returns nil when the model is unavailable" do
    with_unavailable_instance do
      assert_nil QueryEmbedder.default.encode("anything")
    end
  end

  test "encode returns nil for blank text" do
    # Even when available, blank input returns nil.
    assert_nil QueryEmbedder.default.encode("")
    assert_nil QueryEmbedder.default.encode(nil)
  end

  test "encode returns a 384-dim unit-normalised vector when the model is loaded" do
    # Use the real ONNX model since data/mini_lm_onnx/ is now in
    # the repo. If a future dev runs this in an env without the
    # model, skip the test rather than fail.
    skip "ONNX artefacts missing" unless QueryEmbedder.default.available?

    vector = QueryEmbedder.default.encode("soledad existencial")

    assert_not_nil vector
    assert_equal QueryEmbedder::DIMENSION, vector.length
    norm = Math.sqrt(vector.sum { |v| v * v })
    assert_in_delta 1.0, norm, 1e-6, "vector should be L2-normalised"
  end
end
