ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    workers = if ENV["PARALLEL_WORKERS"]
      ENV["PARALLEL_WORKERS"].to_i
    else
      RUBY_PLATFORM.match?(/darwin/) ? 1 : :number_of_processors
    end
    parallelize(workers: workers) unless workers == 1

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    def fake_embedder(available:, vector: nil)
      fake = Object.new
      fake.instance_variable_set(:@available, available)
      fake.instance_variable_set(:@vector, vector)
      fake.define_singleton_method(:available?) { @available }
      fake.define_singleton_method(:encode) { |_text| @available ? @vector : nil }
      fake
    end

    # Swap a class method for the duration of a block, restoring the
    # original after. Used in place of mocha / rspec-style `stub` so we
    # don't need a mocking gem for the in-app semantic search tests.
    def with_stubbed_class_method(klass, method_name, return_value)
      original = klass.method(method_name)
      klass.define_singleton_method(method_name) { return_value }
      yield
    ensure
      klass.define_singleton_method(method_name, original)
    end

    # Add more helper methods to be used by all tests here...
  end
end
