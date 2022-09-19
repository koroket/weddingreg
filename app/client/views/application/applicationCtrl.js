const angular = require("angular");
const swal = require("sweetalert");

angular.module('reg')
  .controller('ApplicationCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    'currentUser',
    'settings',
    'Session',
    'UserService',
    function ($scope, $rootScope, $state, $http, currentUser, settings, Session, UserService) {

      console.log(currentUser.data)

      // Set up the user
      $scope.user = currentUser.data;

      $scope.user.profile.adult = true;

      $scope.user.confirmation["entree"] = ""
      $scope.user.confirmation["entree-option"] = ""
      $scope.selectedGuest = currentUser.data.id

      _setupForm();

      $scope.regIsClosed = Date.now() > settings.data.timeClose;

      $scope.guests = [];
      $scope.guests_loaded = false;

      $scope.selectGuest = function (guestId) {
        $scope.selectedGuest = guestId
        UserService.get(guestId).then(result => {
          console.log(result.data);
        });
        console.log($scope.selectedGuest)
      }

      UserService
        .getGuests()
        .then(response => {
          updateGuests(response.data);
        });

      function updateGuests(data) {
        console.log(data)
        $scope.guests.push({ _id: currentUser.data.id, firstName: currentUser.data.profile.firstName, lastName: currentUser.data.profile.lastName })
        data.forEach(item => {
          $scope.guests.push(item);
        })
        $scope.guests_loaded = true;
        console.log($scope.guests)
        // _setupForm();
      }

      function _updateUser(e) {
        console.log("test submit")
      }

      function _setupForm() {
        // // Custom minors validation rule
        // $.fn.form.settings.rules.allowMinors = function (value) {
        //   return minorsValidation();
        // };

        // Semantic-UI form validation
        $('.ui.form').form({
          inline: true,
          fields: {
            // name: {
            //   identifier: 'name',
            //   rules: [
            //     {
            //       type: 'empty',
            //       prompt: 'Please enter your name.'
            //     }
            //   ]
            // },
            gender: {
              identifier: 'entree',
              rules: [
                {
                  type: 'empty',
                  prompt: 'Please select an entree.'
                }
              ]
            },
            // adult: {
            //   identifier: 'adult',
            //   rules: [
            //     {
            //       type: 'allowMinors',
            //       prompt: 'You must be an adult, or an MIT student.'
            //     }
            //   ]
            // }
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
    }]);
