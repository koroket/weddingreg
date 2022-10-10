angular.module('reg')
  .factory('EmailService', [
  '$http',
  'Session',
  function($http, Session){

    var faqs = '/api/emailTemplates';
    var base = faqs + '/';

    return {
      getAll: function(){
        return $http.get(base);
      },

      getFile: function(name){
      	return $http.get(base + name);
      },

      update: function(id, name, subject, imageurl, loadGuests, trackInAdmin, data, textData){
        return $http.put(base + 'update', {
          name: name,
          subject: subject,
          _id: id,
          imageurl: imageurl,
          loadGuests: loadGuests,
          trackInAdmin: trackInAdmin,
          data: data,
          textData: textData
        });
      },

      preview: function(id, uid) {
        return $http.put(base + "preview/" + id, {
          uid: uid
        });
      },

      send: function(id, uid) {
        return $http.put(base + "sendEmail/" + id, {
          uid: uid
        });
      },

      sendMyself: function(id) {
        return $http.put(base + "sendEmail/" + id, {});
      }

      // delete: function(id){
      //   return $http.put(base + 'delete', {
      //     _id: id
      //   });
      // },

      // submitFaq: function(id, question){
      //   return $http.put(base + 'submit', {
      //     question: question,
      //     _id: id
      //   });
      // },
    };
  }
]);