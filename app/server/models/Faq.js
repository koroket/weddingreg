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
  question: {
    type: String,
  },
  answer: {
    type: String
  }
});

schema.statics.getFaqs = function(callback){
  this
    .findOne({})
    .exec(function(err, faqs){
      return callback(err, faqs);
    });
};

module.exports = mongoose.model('Faqs', schema);
