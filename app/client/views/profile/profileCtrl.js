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
    'SettingsService',
    function ($scope, $rootScope, $state, $http, currentUser, settings, Session, UserService, SettingsService) {

      $scope.settings = {};
      $scope.loading = true;
      $scope.displaySaveWarning = false;
      SettingsService
        .getPublicSettings()
        .then(response => {
          updateSettings(response.data);
        });

      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', hour12: true };

      function updateSettings(settings){
         // Format the dates in settings.
        settings.timeOpen = new Date(settings.timeOpen);
        settings.timeClose = new Date(settings.timeClose);
        settings.timeConfirm = new Date(settings.timeConfirm);

        $scope.timeClose = settings.timeClose.toLocaleDateString("en-US", options)
        $scope.loading = false;
        $scope.settings = settings;
        console.log(settings)
      }

      // Set up the user
      $scope.user = currentUser.data;

      $scope.guests = [];
      $scope.guests_loaded = false;

      $scope.regIsClosed = Date.now() > settings.data.timeClose;
      _setupForm();

      UserService
        .getGuests()
        .then(response => {
          updateGuests(response.data);
        });

      function updateGuests(data) {
        console.log(data)
        var newGuests = []
        for (var i = 0; i < data.length; i++){
          var newGuest = {}
          newGuest["firstName"] = data[i].profile.firstName;
          newGuest["lastName"] = data[i].profile.lastName;
          newGuest["_id"] = data[i]._id
          newGuest["verified"] = data[i].verified
          newGuests.push(newGuest)
        }
        $scope.guests = newGuests;
        $scope.guests_loaded = true;
        // _setupForm();
      }

      function _updateUser(e) {
        console.log($scope.guests)
        UserService
          .updateProfile(Session.getUserId(), $scope.user.profile, $scope.guests)
          .then(response => {
            swal("Thanks!", "Your profile has been saved.", "success").then(value => {
              //$state.go("app.dashboard");
            });
          }, onError);
      }

      function onError(data) {
        $scope.error = data.message;
      }

      function resetError() {
        $scope.error = null;
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
            },
            guestFirstName: {
              identifier: 'guestFirstName',
              rules: [
                {
                  type: ['minLength[1]', 'empty'],
                  prompt: "Please enter your guest's first name."
                }
              ]
            },
            guestLastName: {
              identifier: 'guestLastName',
              rules: [
                {
                  type: ['minLength[1]', 'empty'],
                  prompt: "Please enter your guest's last name."
                }
              ]
            }
          }
        });
      }

      $scope.submitForm = function () {
        resetError();
        $scope.displaySaveWarning = false;
        if ($('.ui.form').form('is valid')) {
          _updateUser();
        } else {
          swal("Uh oh!", "Please Fill The Required Fields", "error");
        }
      };

      $scope.addGuest = function () {
        $scope.displaySaveWarning = true;
        $scope.guests.push({});
      }

      $scope.removeGuest = function (index) {
        $scope.displaySaveWarning = true;
        $scope.guests.splice(index, 1);
      }
    }]);
