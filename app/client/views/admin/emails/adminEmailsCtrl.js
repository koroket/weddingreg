const moment = require('moment');
const swal = require('sweetalert');

angular.module('reg')
  .controller('AdminEmailsCtrl',[
    '$scope',
    '$state',
    '$stateParams',
    '$sce',
    'AuthService',
    'UserService',
    'EmailService',
    function($scope, $state, $stateParams, $sce, AuthService, UserService, EmailService){
      $scope.emailTemplates = [];
      $scope.previewData = "";

      // Semantic-UI moves modal content into a dimmer at the top level.
      // While this is usually nice, it means that with our routing will generate
      // multiple modals if you change state. Kill the top level dimmer node on initial load
      // to prevent this.
      $('.ui.dimmer').remove();
      // Populate the size of the modal for when it appears, with an arbitrary user.
      $scope.selectedTemplate = {};
      $scope.selectedIndex = 0;
      // $scope.selectedUser.sections = generateSections({status: '', confirmation: {
      //   dietaryRestrictions: []
      // }, profile: ''});

      EmailService
        .getAll()
        .then(response => {
          console.log(response.data)
          $scope.emailTemplates = response.data;
        });

      function loadEmailTemplate() {
        EmailService.getFile($scope.selectedTemplate.name)
          .then(response => {
            console.log(response)
            $scope.emailTemplates[$scope.selectedIndex].data = response.data.html
            $scope.emailTemplates[$scope.selectedIndex].textData = response.data.text
            $('.long.template.modal')
              .modal('show');
          })
      }

      $scope.selectTemplate = function(template, index){
        console.log("select template clicked")
        $scope.selectedTemplate = template;
        $scope.selectedIndex = index;
        $scope.previewData = "";
        loadEmailTemplate();
        // $scope.selectedUser.sections = generateSections(user);
      }

      $scope.newEmail = function() {
        $scope.selectedTemplate = {};
        $scope.selectedIndex = $scope.emailTemplates.length;
        $scope.emailTemplates.push($scope.selectedTemplate)
        console.log("email clicked")
        $('.long.template.modal')
          .modal('show');
      }

      $scope.save = function() {
        console.log("saving...");
        EmailService.update($scope.selectedTemplate._id,
          $scope.selectedTemplate.name,
          $scope.selectedTemplate.subject,
          $scope.selectedTemplate.imageURL,
          $scope.selectedTemplate.loadGuests,
          $scope.selectedTemplate.trackInAdmin,
          $scope.selectedTemplate.data,
          $scope.selectedTemplate.textData).then(response => {
          console.log(response);
          if (response && response.data) {
            $scope.emailTemplates[$scope.selectedIndex] = response.data;
          }
        });
      }

      $scope.sendMyself = function() {
        console.log("sending...");
        EmailService.sendMyself($scope.selectedTemplate._id).then(response => {
          console.log(response);
          // if (response && response.data) {
          //   $scope.previewData = $sce.trustAsHtml(response.data);
          // }
        })
      }
      
      $scope.preview = function() {
        console.log("generating preview...")
        EmailService.preview($scope.selectedTemplate._id).then(response => {
          console.log(response);
          if (response && response.data) {
            $scope.previewData = $sce.trustAsHtml(response.data);
          }
        })
      }
    }]);
