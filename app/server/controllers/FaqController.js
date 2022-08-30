var Faq = require('../models/Faq');

var FaqController = {};

/**
 * Update any field in the Faqs.
 * @param  {String}   field    Name of the field
 * @param  {Any}      value    Value to replace it to
 * @param  {Function} callback args(err, settings)
 */
FaqController.updateById = function(id, question, answer, position, unanswered, originator, callback){
  if (id)
  {
    Faq.findOneAndUpdate({
      _id: id
    },
      {
        $set: {
          'question': question,
          'answer': answer,
          'position': position,
          'unanswered': false
        }
      },
      {
        new: true
      },
      callback);
  }
  else
  {
    console.log("new faq")
    console.log(question)
    console.log(answer)
    var faq = new Faq();
    faq.question = question;
    faq.answer = answer;
    faq.position = position;
    faq.unanswered = unanswered;
    faq.originator = originator;
    faq.save(function(err){
      if (err){
        console.log(err)
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback({
            message: 'Account created but error occurred for processing plus ones'
          }, undefined);
        }

        return callback(err, undefined);
      } else {
        return callback(err, faq);
      }
    });

  }
};

FaqController.getFaqs = function(callback){
  Faq.getFaqs(function(err, faqs){
    if (err)
    {
      console.log(err);
    }
    else
    {
      // handle empty faqs case
      if (!faqs) {
        faqs = [];
        return callback(err, faqs)
      }
    }
    callback(err, faqs);
  });
};

FaqController.deleteById = function(id, callback){
  Faq.findOneAndDelete({
    _id: id
  },callback);
};


module.exports = FaqController;