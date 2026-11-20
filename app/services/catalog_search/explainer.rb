# frozen_string_literal: true

module CatalogSearch
  module Explainer
    SEMANTIC_EXPLANATION_COSINE = 0.3

    module_function

    def call(book:, token_score:, weighted_title:, weighted_author:, weighted_authority:, best_authority_name:, semantic_cosine:)
      semantic_suffix = if semantic_cosine && semantic_cosine >= SEMANTIC_EXPLANATION_COSINE
                          "Coincidencia semántica (coseno #{semantic_cosine.round(2)})"
      end

      if token_score <= 0.0
        return semantic_suffix || "Coincidencia semántica"
      end

      primary = if weighted_author >= weighted_title && weighted_author >= weighted_authority
                  "Coincidencia en autor: '#{book.author}'"
      elsif weighted_title >= weighted_authority
                  "Coincidencia en título: '#{book.title}'"
      else
                  "Coincidencia en autoridad: '#{best_authority_name || 'Descriptor'}'"
      end

      semantic_suffix ? "#{primary} · #{semantic_suffix}" : primary
    end
  end
end
