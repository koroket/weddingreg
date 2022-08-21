angular.module('reg')
  .factory('FaqService', [
  '$http',
  'Session',
  function($http, Session){

    var faqs = '/api/faqs';
    var base = faqs + '/';

    return {
      getAll: function(){
        return $http.get(base);
      },

      update: function(id, question, answer, position){
        return $http.put(base + 'update', {
          question: question,
          answer: answer,
          _id: id,
          position: position
        });
      },

      delete: function(id){
        return $http.put(base + 'delete', {
          _id: id
        });
      }
    };
  }
  ]);
