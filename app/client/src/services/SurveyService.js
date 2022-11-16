angular.module('reg')
  .factory('SurveyService', [
  '$http',
  'Session',
  function($http, Session){

    var faqs = '/api/surveys';
    var base = faqs + '/';
    var userbase = '/api/users/'

    return {
      getAll: function(){
        return $http.get(base);
      },

      update: function(id, question){
        return $http.put(base + 'update', {
          question: question,
          _id: id
        });
      },

      delete: function(id){
        return $http.put(base + 'delete', {
          _id: id
        });
      },

      updateSurveyAnswers: function(user){
        return $http.put(userbase + user._id + '/submitAnswers', {
          surveyAnswers: user.surveyAnswers
        });
      },
    };
  }
  ]);
