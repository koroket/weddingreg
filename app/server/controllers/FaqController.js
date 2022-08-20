var Faqs = require('../models/Faqs');

var FaqsController = {};

/**
 * Update any field in the Faqs.
 * @param  {String}   field    Name of the field
 * @param  {Any}      value    Value to replace it to
 * @param  {Function} callback args(err, settings)
 */
FaqsController.updateById = function(id, question, answer, callback){
  var update = {};
  update[field] = value;
  Faqs.findOneAndUpdate({
    _id: id
  },
    {
      $set: {
        'question': question,
        'answer': answer
      }
    },
    {
      new: true
    },
    callback);
};

FaqsController.getFaqs = function(callback){
  Faqs.getFaqs(callback);
};

module.exports = FaqsController;