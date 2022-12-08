angular.module('reg')
  .factory('UserService', [
  '$http',
  'Session',
  function($http, Session){

    var users = '/api/users';
    var base = users + '/';

    return {

      // ----------------------
      // Basic Actions
      // ----------------------
      getCurrentUser: function(){
        return $http.get(base + Session.getUserId());
      },

      get: function(id){
        return $http.get(base + id);
      },

      getAll: function(){
        return $http.get(base);
      },

      getPage: function(page, size, text){
        return $http.get(users + '?' + $.param(
          {
            text: text,
            page: page ? page : 0,
            size: size ? size : 50
          })
        );
      },

      getGuests: function(){
        return $http.get(base + Session.getUserId() + '/guests');
      },

      getGuestsById: function(user_id) {
        return $http.get(base + user_id + '/guests');
      },

      updateProfile: function(id, profile, guests){
        console.log("UserService.js = ")
        console.log(guests)
        return $http.put(base + id + '/profile', {
          profile: profile,
          guests: angular.toJson(guests)
        });
      },

      updateDiningOption: function(id, diningOption) {
        return $http.put(base + id + '/dining', {
          diningOption: diningOption
        });
      },

      updateConfirmation: function(id, confirmation){
        return $http.put(base + id + '/confirm', {
          confirmation: confirmation
        });
      },

      updateCovidVaccine: function(id, body) {
        return $http.post(base + id + '/vaccine', body, {
          headers: {'Content-Type': undefined}
        })
      },

      updateCovidTest: function(id, body) {
        return $http.post(base + id + '/covidtest', body, {
          headers: {'Content-Type': undefined}
        })
      },

      declineAdmission: function(id){
        return $http.post(base + id + '/decline');
      },

      // ------------------------
      // Team
      // ------------------------
      joinOrCreateTeam: function(code){
        return $http.put(base + Session.getUserId() + '/team', {
          code: code
        });
      },

      leaveTeam: function(){
        return $http.delete(base + Session.getUserId() + '/team');
      },

      getMyTeammates: function(){
        return $http.get(base + Session.getUserId() + '/team');
      },

      // -------------------------
      // Admin Only
      // -------------------------

      getCSV: function(){
        $http.get(base + 'exportcsv').then(function (data, status, headers) {
        var linkElement = document.createElement('a');
        try {
            linkElement.setAttribute('href', data.data.path);
            linkElement.setAttribute("download", data.data.filename);
            var clickEvent = new MouseEvent("click", {
                "view": window,
                "bubbles": true,
                "cancelable": false
            });
            linkElement.dispatchEvent(clickEvent);
        } catch (ex) {
            console.log(ex);
        }

        }, function (data) {
          console.log(data);
        });
      },

      getStats: function(){
        return $http.get(base + 'stats');
      },

      admitUser: function(id){
        return $http.post(base + id + '/admit');
      },

      verify: function(id){
        return $http.post(base + id + '/verify');
      },

      unverify: function(id){
        return $http.post(base + id + '/unverify');
      },

      checkIn: function(id){
        return $http.post(base + id + '/checkin');
      },

      checkOut: function(id){
        return $http.post(base + id + '/checkout');
      },

      makeAdmin: function(id){
        return $http.post(base + id + '/makeadmin');
      },

      removeAdmin: function(id){
        return $http.post(base + id + '/removeadmin');
      },

      markTestUser: function(id){
        return $http.post(base + id + '/markTestUser');
      },

      unmarkTestUser: function(id){
        return $http.post(base + id + '/unmarkTestUser');
      },

      updateTableId: function(id, tableid) {
        return $http.put(base + id + '/table', {
          tableid: tableid
        });
      },

      hasDiningUpdates: function(guest){
        var numUpdates = 0;
        if (!guest.status.completedProfile)
        {
          numUpdates += 1
        }
        return numUpdates
      },

      hasCovidUpdates: function(guest){
        var numUpdates = 0;
        if (!guest.status.uploadedVaccine)
        {
          numUpdates += 1
        }
        if (!guest.status.uploadedCovidTest)
        {
          numUpdates += 1
        }
        return numUpdates
      },

      destroyUser: function(id) {
        return $http.post(base + id + '/destroy');
      },

      hasSurveyUpdates: function(guest) {
        var numUpdates = 0;
        if (!guest.status.completedSurvey) 
        {
          numUpdates +=1
        }
        return numUpdates;
      }
    };
  }
  ]);
