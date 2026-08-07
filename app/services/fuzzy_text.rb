# Shared word-normalization used by both the SymSpell indexer
# (app/services/sym_spell_index.rb) and the import task that populates
# book_words (lib/tasks/import_book_words.rake). Keeping it in one
# module means the words stored in the DB always match the tokens the
# indexer produces at query time.
module FuzzyText
  module_function

  # Lowercases, strips diacritics, keeps only [a-z0-9], and drops
  # tokens shorter than 3 chars. Returns nil when nothing survives.
  def normalize_word(raw)
    return nil if raw.blank?
    I18n.transliterate(raw.to_s.downcase)
        .gsub(/[^a-z0-9]/, "")
        .then { |w| w.length >= 3 ? w : nil }
  end

  # Splits a string into normalized words >= 3 chars, deduped, order preserved.
  def normalize_words(raw)
    return [] if raw.blank?
    raw.to_s.split(/\s+/).filter_map { |w| normalize_word(w) }.uniq
  end
end
