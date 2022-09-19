angular.module('reg')
  .controller('LoginCtrl', [
    '$scope',
    '$http',
    '$state',
    'settings',
    'Utils',
    'AuthService',
    function ($scope, $http, $state, settings, Utils, AuthService) {

      // Is registration open?
      var Settings = settings.data;
      $scope.regIsOpen = Utils.isRegOpen(Settings);
      $scope.guests = [];
      $scope.isInfoHovered = false;

      // Start state for login
      $scope.loginState = 'login';

      function onSuccess() {
        $state.go('app.dashboard');
      }

      function onError(data) {
        $scope.error = data.message;
      }

      function resetError() {
        $scope.error = null;
      }

      $scope.login = function () {
        resetError();
        AuthService.loginWithPassword(
          $scope.email, $scope.password, onSuccess, onError);
      };

      $scope.register = function () {
        resetError();
        AuthService.register(
          $scope.firstName, $scope.lastName,
          $scope.email, $scope.password, $scope.evntCode, $scope.guests, onSuccess, onError);
      };

      $scope.setLoginState = function (state) {
        $scope.loginState = state;
      };

      $scope.sendResetEmail = function () {
        var email = $scope.email;
        AuthService.sendResetEmail(email);
        swal("Don't sweat!", "An email should be sent to you shortly.", "success");
      };

      $scope.addGuest = function () {
        $scope.guests.push({});
      }

      $scope.removeGuest = function (index) {
        $scope.guests.splice(index, 1);
      }

      $scope.guestInfoHovered = function () {
        console.log("hover tested");
        $scope.isInfoHovered = true;
      }

      $scope.guestInfoUnhovered = function () {
        console.log("unhover tested");
        $scope.isInfoHovered = false;
      }
    }
  ]);
