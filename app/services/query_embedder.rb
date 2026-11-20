# frozen_string_literal: true

require "onnxruntime"
require "tokenizers"

# Embeds a free-text search query into the same 384-dim vector space as
# the offline book embeddings (all-MiniLM-L6-v2 via ONNX Runtime + WordPiece).
class QueryEmbedder
  MODEL_DIR = Rails.root.join("data", "mini_lm_onnx")
  DIMENSION = 384
  MAX_TOKENS = 128

  @default_mutex = Mutex.new

  class << self
    def default
      @default_mutex.synchronize { @default ||= new }
    end

    def reset!
      @default_mutex.synchronize do
        remove_instance_variable(:@default) if defined?(@default)
      end
    end
  end

  def initialize
    @mutex = Mutex.new
  end

  def available?
    return @available if defined?(@available)

    @mutex.synchronize do
      return @available if defined?(@available)

      @available = model_file.exist? && tokenizer_file.exist?
    end
  end

  def encode(text)
    return nil unless available?
    return nil if text.blank?

    vector = begin
      @mutex.synchronize do
        ensure_loaded!
        input_ids, attention_mask = tokenize(text)
        outputs = run_model(input_ids, attention_mask)
        mean_pool(outputs, attention_mask)
      end
    rescue StandardError => e
      Rails.logger&.warn("QueryEmbedder inference failed: #{e.class}: #{e.message}")
      return nil
    end

    norm = Math.sqrt(vector.sum { |v| v * v })
    return nil if norm.zero?

    vector.map { |v| v / norm }
  end

  private

  def model_file
    @model_file ||= begin
      quantized = MODEL_DIR.join("model_quantized.onnx")
      quantized.exist? ? quantized : MODEL_DIR.join("model.onnx")
    end
  end

  def tokenizer_file
    @tokenizer_file ||= MODEL_DIR.join("tokenizer.json")
  end

  def ensure_loaded!
    return if @session && @tokenizer

    @tokenizer = Tokenizers::Tokenizer.from_file(tokenizer_file.to_s)
    @session = OnnxRuntime::InferenceSession.new(model_file.to_s)
  end

  def tokenize(text)
    encoding = @tokenizer.encode(text)
    ids = encoding.ids.first(MAX_TOKENS)
    mask = encoding.attention_mask.first(MAX_TOKENS)

    while ids.length < MAX_TOKENS
      ids << 0
      mask << 0
    end

    [ ids, mask ]
  end

  def run_model(input_ids, attention_mask)
    input_names = @session.inputs.map { |i| i[:name] }
    feeds = {
      "input_ids" => [ input_ids.map(&:to_i) ],
      "attention_mask" => [ attention_mask.map(&:to_i) ]
    }
    feeds["token_type_ids"] = [ Array.new(MAX_TOKENS, 0) ] if input_names.include?("token_type_ids")

    output_names = @session.outputs.map { |o| o[:name] }
    result = @session.run(output_names, feeds)
    Array(result.first.first)
  end

  def mean_pool(token_embeddings, attention_mask)
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
