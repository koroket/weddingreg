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

      $scope.selectedGuest = currentUser.data.id

      $scope.regIsClosed = Date.now() > settings.data.timeClose;

      $scope.guests = [];
      $scope.guests_loaded = false;

      $scope.selectGuest = function (guestId) {
        $scope.selectedGuest = guestId
      }

      $scope.isInfoHovered = false;

      $scope.guestInfoHovered = function(){
        $scope.isInfoHovered = true;
      }

      $scope.guestInfoUnhovered = function(){
        $scope.isInfoHovered = false;
      }

      UserService
        .getGuests()
        .then(response => {
          updateGuests(response.data);
        });

      function pushGuests(guest, list) {
        if (!guest.diningOption) {
          guest["diningOption"] = {}
        }
        if (!guest.diningOption.dietaryRestrictions) {
          guest.diningOption["dietaryRestrictions"] = ""
        }
        guest.diningOptionUpdates = UserService.hasDiningUpdates(guest);
        list.push(guest)
      }

      function updateGuests(data) {
        var newGuests = []
        pushGuests(currentUser.data, newGuests)
        data.forEach(item => {
          pushGuests(item, newGuests)
        })
        $scope.guests = newGuests;
        $scope.guests_loaded = true;
      }

      function _updateUser(selectedGuest) {
        UserService.updateDiningOption(selectedGuest._id, selectedGuest.diningOption)
        .then(response => {
          console.log(response)
          $rootScope.$emit("RecalculateUpdates", response.data);
          selectedGuest.diningOptionUpdates = UserService.hasDiningUpdates(response.data);
          swal("Saved!", "Dining option has been saved", "success").then(value => {
            // $state.go("app.dashboard");
          });
        })
      }

      $scope.submitForm = function (index) {
        console.log(index)
        console.log($scope.guests[index])
        var selectedGuest = $scope.guests[index]
        console.log(selectedGuest.diningOption)
        if (!selectedGuest.diningOption.entree) {
          swal("Please select an entree", "Entree selection is required", "error");
          return;
        }
        if (selectedGuest.diningOption.entree == "M" && 
            !selectedGuest.diningOption.entreeOption || 
            selectedGuest.diningOption.entreeOption == "") {
          swal("Please select doneness", "Doneness for Filet Mignon is required", "error");
          return;
        }
        _updateUser(selectedGuest);
      };
    }]);
