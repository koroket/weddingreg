const angular = require("angular");
const swal = require("sweetalert");

angular.module('reg')
  .controller('GamesurveyCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    'currentUser',
    'settings',
    'Session',
    'SettingsService',
    'UserService',
    'SurveyService',
    function ($scope, $rootScope, $state, $http, currentUser, settings, Session, SettingsService, UserService, SurveyService) {
      if (currentUser.data.admin) {
        $scope.addSurvey = function(){
          $scope.surveys.push({});
        }

        $scope.saveSurvey = function(index){
          var survey = $scope.surveys[index];
          SurveyService
            .update(survey._id,survey.question)
            .then(response => {
              console.log("doone...")
              if (response && response.data && response.data._id)
              {
                $scope.surveys[index]._id = response.data._id
              }
            });
        }
      }

      console.log(currentUser.data)

      // Set up the user
      $scope.user = currentUser.data;

      if (!$scope.user.surveyAnswers) {
        $scope.user.surveyAnswers = {};
      }

      $scope.selectedGuest = currentUser.data.id

      $scope.guests = [];
      $scope.guests_loaded = false;

      $scope.surveys = [];

      $scope.selectGuest = function (guestId) {
        $scope.selectedGuest = guestId
      }

      SurveyService
        .getAll()
        .then(response => {
          $scope.surveys = response.data;
        });

      UserService
        .getGuests()
        .then(response => {
          updateGuests(response.data);
        });

      function pushGuests(guest, list) {
        if (!guest.surveyOption) {
          guest["surveyOption"] = {}
        }
        guest.surveyOptionUpdates = UserService.hasSurveyUpdates(guest);
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

      $scope.submitForm = function (guest) {
        var invalid = false;
        for (var i = 0; i < $scope.surveys.length; i++) {
          if (!guest.surveyAnswers[$scope.surveys[i]._id] ||
              guest.surveyAnswers[$scope.surveys[i]._id] === '') {
            $scope.surveys[i].invalid = true;
            invalid = true;
          }
          else {
            $scope.surveys[i].invalid = false;
          }
        }
        if (invalid) {
          swal("Please fill out all questions!", "All questions are required", "error");
          return;
        }
        SurveyService.updateSurveyAnswers(guest).then(response => {
          $rootScope.$emit("RecalculateUpdates", response.data);
          guest.surveyOptionUpdates = UserService.hasSurveyUpdates(response.data);
          console.log(response.data);
          swal("Thank you!", "Survey answers has been saved", "success").then(value => {
            // $state.go("app.dashboard");
          });
        });
      };
    }]);
