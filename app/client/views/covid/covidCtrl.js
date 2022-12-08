angular.module('reg').directive("ngUploadChange",function(){
    return{
        scope:{
            ngUploadChange:"&"
        },
        link:function($scope, $element, $attrs){
            $element.on("change",function(event){
                $scope.$apply(function(){
                    $scope.ngUploadChange({$event: event})
                })
            })
            $scope.$on("$destroy",function(){
                $element.off();
            });
        }
    }
});

angular.module('reg')
  .controller('CovidCtrl', [
    '$scope',
    '$rootScope',
    'currentUser',
    'settings',
    'Session',
    'Utils',
    'UserService',
    function($scope, $rootScope, currentUser, settings, Session, Utils, UserService){
      // Get the current user's most recent data.
      var Settings = settings.data;

      $scope.regIsOpen = Utils.isRegOpen(Settings);

      $scope.user = currentUser.data;

      $scope.loading = false;

      $scope.isDisabled = true;

      $scope.isInfoHovered = false;

      $scope.selectedGuest = currentUser.data.id

      $scope.guests = [];
      $scope.guests_loaded = false;

      $scope.selectGuest = function (guestId) {
        $scope.selectedGuest = guestId
      }

      UserService
        .getGuests()
        .then(response => {
          updateGuests(response.data);
        });

      function pushGuests(guest, list) {
        guest.covidOptionUpdates = UserService.hasCovidUpdates(guest);
        guest.wantsToReupload = false;
        guest.file = null;

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

      $scope.guestInfoHovered = function(){
        $scope.isInfoHovered = true;
      }

      $scope.guestInfoUnhovered = function(){
        $scope.isInfoHovered = false;
      }

      // On file Select
      $scope.fileChanged = function(event, index) {
        $scope.guests[index].file = event.target.files[0];
      }

      $scope.reupload = function(index) {
        $scope.guests[index].wantsToReupload = true;
      }
    
      // OnClick of button Upload
      $scope.onUpload = function(index) {
          var guest = $scope.guests[index];
          $scope.loading = true;

          // Create form data
          var formData = new FormData();
          var file = guest.file
            
          // Store form name as "file" with file data
          formData.append("file", file, file.name);
          UserService.updateCovidVaccine(guest._id, formData)
            .then(response => {
              $scope.guests[index] = response.data
              guest.wantsToReupload = false;
              $rootScope.$emit("RecalculateUpdates", response.data);
              guest.covidOptionUpdates = UserService.hasCovidUpdates(response.data);
              swal("Saved!", "COVID Test Results have been saved", "success").then(value => {
                // $state.go("app.dashboard");
              });
            }, response => {
              console.log(response)
              if ((response.status && response.status == 413) ||
                  response.data === 'File too large')
              {
                var limit = "10MB"
                var sizeText = ""
                if (file.size > 1000000) {
                  var sizeInMB = file.size/1000000
                  sizeText = sizeInMB + "MB"
                }
                else if (file.size > 1000) {
                  var sizeInkB = file.size/1000
                  sizeText = sizeInkB + "kB"
                }
                else {
                  var sizeInb = file.size
                  sizeText = sizeInb + "bytes"
                }

                swal("File too large", "Your file size (" + sizeText + ") is over the limit of " + limit, "error");
              }
              else {
                swal("Uh oh!", response.data, "error");
              }
              
            });
          console.log(formData)
      }



      $scope.testFileChanged = function(event, index) {
        // $scope.file = event.target.files[0];
        console.log(event)
        $scope.guests[index].testFile = event.target.files[0];
      }

      $scope.testReupload = function() {
        $scope.wantsToReuploadTest = true;
      }

      $scope.reuploadTest = function(index) {
        $scope.guests[index].wantsToReuploadTest = true;
      }
    
      // OnClick of button Upload
      $scope.onTestUpload = function(index) {
          var guest = $scope.guests[index];
          $scope.loading = true;

          // Create form data
          var formData = new FormData();
          var file = guest.testFile
            
          // Store form name as "file" with file data
          formData.append("file", file, file.name);
          UserService.updateCovidTest(guest._id, formData)
            .then(response => {
              $scope.guests[index] = response.data
              guest.wantsToReuploadTest = false;
              $rootScope.$emit("RecalculateUpdates", response.data);
              guest.covidOptionUpdates = UserService.hasCovidUpdates(response.data);
              swal("Saved!", "COVID information has been saved", "success").then(value => {
                // $state.go("app.dashboard");
              });
            }, response => {
              console.log(response)
              if ((response.status && response.status == 413) ||
                  response.data === 'File too large')
              {
                var limit = "10MB"
                var sizeText = ""
                if (file.size > 1000000) {
                  var sizeInMB = file.size/1000000
                  sizeText = sizeInMB + "MB"
                }
                else if (file.size > 1000) {
                  var sizeInkB = file.size/1000
                  sizeText = sizeInkB + "kB"
                }
                else {
                  var sizeInb = file.size
                  sizeText = sizeInb + "bytes"
                }

                swal("File too large", "Your file size (" + sizeText + ") is over the limit of " + limit, "error");
              }
              else {
                swal("Uh oh!", response.data, "error");
              }
              
            });
          console.log(formData)
      }


    }]);
