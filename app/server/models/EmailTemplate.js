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
  subject: {
    type: String,
    required: true
  },
  name: {
    type: String,
    unique: true,
    required: true
  },
  imageURL: {
    type: String
  },
  loadGuests: {
    type: Boolean,
    default: false,
  },
  trackInAdmin: {
    type: Boolean,
    default: false,
  }
});

schema.statics.findOneByName = function(name){
  return this.findOne({
    name: name
  });
};

schema.statics.getEmailTemplates = function(callback){
  this
    .find({})
    .exec(function(err, res){
      return callback(err, res);
    });
};

module.exports = mongoose.model('EmailTemplate', schema);
