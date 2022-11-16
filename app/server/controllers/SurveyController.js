var Survey = require('../models/Survey');
var User = require('../models/User');

var SurveyController = {};

SurveyController.updateById = function(id, question, callback){
  if (id)
  {
    Survey.findOneAndUpdate({
      _id: id
    },
      {
        $set: {
          'question': question
        }
      },
      {
        new: true
      },
      callback);
  }
  else
  {
    console.log("new survey")
    var survey = new Survey();
    survey.question = question;
    survey.save(function(err){
      if (err){
        console.log(err)
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback({
            message: 'Survey created but error occurred for processing plus ones'
          }, undefined);
        }

        return callback(err, undefined);
      } else {
        return callback(err, survey);
      }
    });

  }
};

SurveyController.getSurveys = function(callback){
  Survey.getSurveys(function(err, surveys){
    if (err)
    {
      console.log(err);
    }
    else
    {
      if (!surveys) {
        surveys = [];
        return callback(err, surveys)
      }
    }
    callback(err, surveys);
  });
};

SurveyController.deleteById = function(id, callback){
  Survey.findOneAndDelete({
    _id: id
  },callback);
};


SurveyController.updateAnswersForUser = function(id, answers, callback) {
  console.log(id);
  console.log(answers);
  User.findOneAndUpdate({
    _id: id
  },
    {
      $set: {
        'surveyAnswers': answers,
        'status.completedSurvey': true
      }
    },
    {
      new: true
    },
    callback);
};

module.exports = SurveyController;