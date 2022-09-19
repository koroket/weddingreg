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
    'SettingsService',
    'UserService',
    function ($scope, $rootScope, $state, $http, currentUser, settings, Session, SettingsService, UserService) {

      console.log(currentUser.data)

      // Set up the user
      $scope.user = currentUser.data;

      $scope.selectedGuest = currentUser.data.id

      $scope.regIsClosed = Date.now() > settings.data.timeClose;

      $scope.guests = [];
      $scope.guests_loaded = false;

      $scope.settings = {};
      SettingsService
        .getPublicSettings()
        .then(response => {
          updateSettings(response.data);
        });

      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', hour12: true };

      function updateSettings(settings){
        settings.timeClose = new Date(settings.timeClose);

        $scope.timeClose = settings.timeClose.toLocaleDateString("en-US", options)
        $scope.settings = settings;
      }

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

      $scope.isDonenessHovered = false;

      $scope.donenessHovered = function(){
        $scope.isDonenessHovered = true;
      }

      $scope.donenessUnhovered = function(){
        $scope.isDonenessHovered = false;
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
