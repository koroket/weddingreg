angular.module('reg')
  .factory('TableService', [
  '$http',
  'Session',
  function($http, Session){

    var faqs = '/api/tables';
    var base = faqs + '/';

    return {
      getAll: function(){
        return $http.get(base);
      },

      update: function(id, data){
        console.log(data);
        return $http.put(base + 'update', {
          updateData: data,
          _id: id
        });
      }
    };
  }
  ]);