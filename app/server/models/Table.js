var mongoose = require('mongoose');

/**
 * Faq Schema!
 *
 * Fields with select: false are not public.
 * These can be retrieved in controller methods.
 *
 * @type {mongoose}
 */
var schema = new mongoose.Schema({
  // Basic info
  tableid: {
    type: String,
  },
  top: {
    type: String
  },
  left: {
    type: String
  },
  width: {
    type: String
  },
  height: {
    type: String
  }
});

schema.statics.getTables = function(callback){
  this
    .find({})
    .exec(function(err, tables){
      return callback(err, tables);
    });
};

module.exports = mongoose.model('Tables', schema);
