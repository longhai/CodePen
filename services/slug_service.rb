require 'mongo_mapper'
require_relative '../models/slug'

class SlugService
  def initialize(db = 'tinkerbox')
    MongoMapper.database = db
  end

  def save_slug(slug)
    begin
      Slug.new(slug).save
    rescue
      #TODO: handle exceptions
      throw "Double Fuck!"
    end
  end
end
