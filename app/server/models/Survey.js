var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  // Basic info
  question: {
    type: String,
  }
});

schema.statics.getSurveys = function(callback){
  this
    .find({})
    .exec(function(err, surveys){
      return callback(err, surveys);
    });
};

module.exports = mongoose.model('Surveys', schema);
