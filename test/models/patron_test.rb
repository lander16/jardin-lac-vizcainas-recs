require "test_helper"

class PatronTest < ActiveSupport::TestCase
  test "valid patron" do
    patron = Patron.new(id: "test1234", name: "María Elena", email: "elena@test.com", cardnumber: "1234567890")
    assert patron.valid?
  end

  test "invalid without id or name" do
    patron = Patron.new
    assert_not patron.valid?
    assert_includes patron.errors[:id], "can't be blank"
    assert_includes patron.errors[:name], "can't be blank"
  end
end
