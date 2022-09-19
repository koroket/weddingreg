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
    'currentUser',
    'settings',
    'Session',
    'Utils',
    'UserService',
    function($scope, currentUser, settings, Session, Utils, UserService){
      // Get the current user's most recent data.
      var Settings = settings.data;

      $scope.regIsOpen = Utils.isRegOpen(Settings);

      $scope.user = currentUser.data;

      console.log(currentUser.data)

      // $scope.user["covid"] = {}

      // $scope.user.covid["vaccine"] = null;

      $scope.file = null; // Variable to store file

      $scope.loading = false;

      $scope.isDisabled = true;

      $scope.isInfoHovered = false;

      $scope.wantsToReupload = false;

      $scope.guestInfoHovered = function(){
        $scope.isInfoHovered = true;
      }

      $scope.guestInfoUnhovered = function(){
        $scope.isInfoHovered = false;
      }

      // On file Select
      $scope.fileChanged = function(event) {
        // $scope.file = event.target.files[0];
        console.log(event)
        $scope.files = event.target.files;
      }

      $scope.reupload = function() {
        $scope.wantsToReupload = true;
      }
    
      // OnClick of button Upload
      $scope.onUpload = function() {
          $scope.loading = true;
          console.log($scope.files);
          // Create form data
          var formData = new FormData();
          var file = $scope.files[0]
            
          // Store form name as "file" with file data
          formData.append("file", file, file.name);
          UserService.updateCovidVaccine(Session.getUserId(), formData)
            .then(response => {
              console.log(response)
              $scope.user = response.data
              $scope.wantsToReupload = false;
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
                swal("Uh oh!", "Something went wrong.", "error");
              }
              
            });
          console.log(formData)
      }



      $scope.testFileChanged = function(event) {
        // $scope.file = event.target.files[0];
        console.log(event)
      }

      $scope.testReupload = function() {
        $scope.wantsToReupload = true;
      }
    
      // OnClick of button Upload
      $scope.onTestUpload = function() {

      }


    }]);
