const angular = require("angular");
const swal = require("sweetalert");

angular.module('reg')
  .controller('ProfileCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    'currentUser',
    'settings',
    'Session',
    'UserService',
    function ($scope, $rootScope, $state, $http, currentUser, settings, Session, UserService) {

      // Set up the user
      $scope.user = currentUser.data;

      $scope.guests = [];
      $scope.guests_loaded = false;

      // If so, default them to adult: true
      if ($scope.isMitStudent) {
        $scope.user.profile.adult = true;
      }

      $scope.regIsClosed = Date.now() > settings.data.timeClose;
      _setupForm();

      UserService
        .getGuests()
        .then(response => {
          updateGuests(response.data);
        });

      function updateGuests(data) {
        console.log(data)
        $scope.guests = data;
        $scope.guests_loaded = true;
      }

      function _updateUser(e) {
        console.log($scope.guests)
        UserService
          .updateProfile(Session.getUserId(), $scope.user.profile, $scope.guests)
          .then(response => {
            swal("Thanks!", "Your profile has been saved.", "success").then(value => {
              //$state.go("app.dashboard");
            });
          }, response => {
            swal("Uh oh!", "Something went wrong.", "error");
          });
      }

      function isMinor() {
        return !$scope.user.profile.adult;
      }

      function minorsAreAllowed() {
        return settings.data.allowMinors;
      }

      function minorsValidation() {
        // Are minors allowed to register?
        if (isMinor() && !minorsAreAllowed()) {
          return false;
        }
        return true;
      }

      function _setupForm() {
        // Custom minors validation rule
        $.fn.form.settings.rules.allowMinors = function (value) {
          return minorsValidation();
        };

        // Semantic-UI form validation
        $('.ui.form').form({
          inline: true,
          fields: {
            firstName: {
              identifier: 'firstName',
              rules: [
                {
                  type: 'empty',
                  prompt: 'Please enter your first name.'
                }
              ]
            },
            lastName: {
              identifier: 'lastName',
              rules: [
                {
                  type: 'empty',
                  prompt: 'Please enter your last name.'
                }
              ]
            }
          }
        });
      }

      $scope.submitForm = function () {
        if ($('.ui.form').form('is valid')) {
          _updateUser();
        } else {
          swal("Uh oh!", "Please Fill The Required Fields", "error");
        }
      };

      $scope.addGuest = function () {
        $scope.guests.push({});
      }

      $scope.removeGuest = function (guest) {
        console.log(guest);
        var i = 0;
        var index;
        $scope.guests.forEach(element => {
          console.log(element);
          if (element.firstName == guest) {
            index = i;
          } else {
            i++;
          }
        });
        $scope.guests.splice(index, 1);
      }
    }]);
