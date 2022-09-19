const angular = require('angular');
const Utils = require('../../src/modules/Utils.js');

angular.module('reg')
  .service('settings', function() {})
  .controller('SidebarCtrl', [
    '$rootScope',
    '$scope',
    'settings',
    'Utils',
    'AuthService',
    'Session',
    'UserService',
    'EVENT_INFO',
    function($rootScope, $scope, settings, Utils, AuthService, Session, UserService, EVENT_INFO){

      var settings = settings.data;
      var user = $rootScope.currentUser;

      console.log($rootScope.currentUser)

      $scope.myUser = user;

      console.log($scope.myUser)

      $scope.EVENT_INFO = EVENT_INFO;

      $scope.pastConfirmation = Utils.isAfter(user.status.confirmBy);

      $scope.diningOptionUpdates = 0;
      $scope.covidOptionUpdates = 0;

      function updateGuests(data) {
        var allUsers = []
        allUsers.push($rootScope.currentUser);
        for (var i = 0; i < data.length; i++) {
          allUsers.push(data[i]);
        }
        var diningOptionUpdates = 0;
        var covidOptionUpdates = 0;
        for (var i = 0; i < allUsers.length; i++) {
          diningOptionUpdates+=UserService.hasDiningUpdates(allUsers[i]);
          covidOptionUpdates+=UserService.hasCovidUpdates(allUsers[i])
        }
        $scope.diningOptionUpdates = diningOptionUpdates
        $scope.covidOptionUpdates = covidOptionUpdates
        console.log($scope.diningOptionUpdates)
        console.log($scope.covidOptionUpdates)
      }

      function refreshUpdates(){
        UserService
          .getGuests()
          .then(response => {
            updateGuests(response.data);
          }); 
      }

      $rootScope.$on("RecalculateUpdates", function(user){
        if (user._id == $rootScope.currentUser._id) {
          $rootScope.currentUser = user;
        }
        refreshUpdates();
      });

      refreshUpdates();

      $scope.logout = function(){
        AuthService.logout();
      };

      $scope.showSidebar = false;
      $scope.toggleSidebar = function(){
        $scope.showSidebar = !$scope.showSidebar;
      };

      // oh god jQuery hack
      $('.item').on('click', function(){
        $scope.showSidebar = false;
      });

    }]);
