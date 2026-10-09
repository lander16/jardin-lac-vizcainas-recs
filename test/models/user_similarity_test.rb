require "test_helper"

class UserSimilarityTest < ActiveSupport::TestCase
  setup do
    @patron = Patron.create!(id: "us_patron_1", name: "Patron Alpha")
    @similar_patron = Patron.create!(id: "us_patron_2", name: "Patron Beta")
    @user_similarity = UserSimilarity.new(
      patron: @patron,
      similar_patron: @similar_patron,
      jaccard_score: 0.75
    )
  end

  test "valid user similarity" do
    assert @user_similarity.valid?
  end

  test "invalid without patron_id" do
    @user_similarity.patron = nil
    assert_not @user_similarity.valid?
    assert_includes @user_similarity.errors[:patron_id], "can't be blank"
  end

  test "invalid without similar_patron_id" do
    @user_similarity.similar_patron = nil
    assert_not @user_similarity.valid?
    assert_includes @user_similarity.errors[:similar_patron_id], "can't be blank"
  end

  test "invalid with duplicate similar_patron_id scoped to patron_id" do
    @user_similarity.save!
    duplicate = UserSimilarity.new(
      patron: @patron,
      similar_patron: @similar_patron,
      jaccard_score: 0.40
    )
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:similar_patron_id], "has already been taken"

    reverse = UserSimilarity.new(
      patron: @similar_patron,
      similar_patron: @patron,
      jaccard_score: 0.40
    )
    assert reverse.valid?
  end

  test "belongs_to patron and similar_patron associations" do
    @user_similarity.save!
    assert_equal @patron, @user_similarity.patron
    assert_equal @similar_patron, @user_similarity.similar_patron
  end
end
