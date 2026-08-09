# frozen_string_literal: true

require "onnxruntime"
require "tokenizers"

# Embeds a free-text search query into the same 384-dim vector space as
# the offline book embeddings (all-MiniLM-L6-v2 via ONNX Runtime + the
# HuggingFace WordPiece tokenizer).
#
# The model artefacts in data/mini_lm_onnx/ are produced once by
# pipeline/export_onnx.py and committed to the repo, so the Rails app
# never needs PyTorch or Python at runtime.
#
# Usage:
#   QueryEmbedder.new.encode("soledad existencial")  # => Array<Float> length 384
#   QueryEmbedder.new.available?                     # => true / false
#
# The encode method returns nil if the model is unavailable, so the
# caller can degrade gracefully to token-only search.
class QueryEmbedder
  MODEL_DIR = Rails.root.join("data", "mini_lm_onnx")
  DIMENSION = 384
  MAX_TOKENS = 128

  class << self
    # Returns the process-wide embedder, lazily loading the model on
    # first use. Tests stub this method to inject a fake.
    def default
      @default ||= new
    end

    # Reset the cached instance. Test-only helper.
    def reset!
      remove_instance_variable(:@default) if defined?(@default)
    end
  end

  def available?
    return @available if defined?(@available)

    @available = model_file.exist? && tokenizer_file.exist?
  end

  # Returns a 384-dim Float Array (unit-normalised) for the given text,
  # or nil if the model isn't available or inference fails.
  def encode(text)
    return nil unless available?
    return nil if text.blank?

    begin
      ensure_loaded!

      input_ids, attention_mask = tokenize(text)
      outputs = run_model(input_ids, attention_mask)
      vector = mean_pool(outputs, attention_mask)
    rescue StandardError
      return nil
    end

    # L2-normalise so cosine == dot product.
    norm = Math.sqrt(vector.sum { |v| v * v })
    return nil if norm.zero?
    vector.map { |v| v / norm }
  end

  private

  def model_file
    @model_file ||= MODEL_DIR.join("model_quantized.onnx").tap do |path|
      # Fall back to the unquantized filename in case export_onnx.py
      # ever runs without quantization.
      @model_file = MODEL_DIR.join("model.onnx") unless path.exist?
    end
  end

  def tokenizer_file
    @tokenizer_file ||= MODEL_DIR.join("tokenizer.json")
  end

  def ensure_loaded!
    return if @session

    @session = OnnxRuntime::InferenceSession.new(model_file.to_s)
    @tokenizer = Tokenizers::Tokenizer.from_file(tokenizer_file.to_s)
  end

  def tokenize(text)
    encoding = @tokenizer.encode(text)
    ids = encoding.ids.first(MAX_TOKENS)
    mask = encoding.attention_mask.first(MAX_TOKENS)

    # Right-pad to a fixed length so the ONNX input is always a
    # rectangular tensor.
    while ids.length < MAX_TOKENS
      ids << 0
      mask << 0
    end

    [ ids, mask ]
  end

  def run_model(input_ids, attention_mask)
    # The MiniLM ONNX export expects 2D int64 tensors with shape
    # [batch_size, sequence_length]. We always run a single example,
    # so the batch dim is 1.
    input_names = @session.inputs.map { |i| i[:name] }
    feeds = {
      "input_ids"      => [ input_ids.map(&:to_i) ],
      "attention_mask" => [ attention_mask.map(&:to_i) ]
    }
    feeds["token_type_ids"] = [ Array.new(MAX_TOKENS, 0) ] if input_names.include?("token_type_ids")

    output_names = @session.outputs.map { |o| o[:name] }
    result = @session.run(output_names, feeds)
    # The onnxruntime gem wraps the result in a redundant outer array,
    # so the actual [seq, dim] matrix is `result[0][0]`.
    Array(result.first.first)
  end

  def mean_pool(token_embeddings, attention_mask)
    # token_embeddings: array of length seq, each a 384-dim array.
    dim = DIMENSION
    sum = Array.new(dim, 0.0)
    counts = 0
    token_embeddings.each_with_index do |step, idx|
      next if attention_mask[idx].zero?
      dim.times { |i| sum[i] += step[i] }
      counts += 1
    end
    return sum if counts.zero?
    dim.times { |i| sum[i] /= counts }
    sum
  end
end
