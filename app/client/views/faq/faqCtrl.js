const angular = require('angular');
const showdown = require('showdown');
const swal = require('sweetalert');

angular.module('reg')
  .controller('FaqCtrl', [
    '$rootScope',
    '$scope',
    '$sce',
    'currentUser',
    'settings',
    'Utils',
    'AuthService',
    'UserService',
    'FaqService',
    'Session',
    'EVENT_INFO',
    'DASHBOARD',
    function($rootScope, $scope, $sce, currentUser, settings, Utils, AuthService, UserService, FaqService, Session, EVENT_INFO, DASHBOARD){
      var Settings = settings.data;
      var user = currentUser.data;
      $scope.user = user;
      $scope.faqs = [];
      $scope.question = "";

      FaqService
        .getAll()
        .then(response => {
          updateFaqs(response.data);
        });

      function updateFaqs(data){
        for (var i = 0; i < data.length; i++)
        {
          if (!data[i].unanswered)
          {
            data[i].htmlAnswer = $sce.trustAsHtml(data[i].answer);
          }
        }
        console.log(data)
        data.sort( compareFaq );
        $scope.faqs = data;
        $scope.faqs_loaded = true;
      }

      function compareFaq( a, b ) {
        if ( a.position < b.position ){
          return -1;
        }
        if ( a.position > b.position ){
          return 1;
        }
        return 0;
      }

      $scope.DASHBOARD = DASHBOARD;

      $scope.addFaq = function () {
        var position = $scope.faqs.length
        $scope.faqs.push({editing:true, position:position});
      }

      $scope.saveFaq = function (index) {
        var faq = $scope.faqs[index];
        console.log("saving...")
        FaqService
          .update(faq._id,faq.question,faq.answer, faq.position)
          .then(response => {
            console.log("doone...")
            console.log(response);
            if (response && response.data && response.data._id)
            {
              $scope.faqs[index]._id = response.data._id
            }
            $scope.faqs[index].htmlAnswer = $sce.trustAsHtml($scope.faqs[index].answer);
            $scope.faqs[index].editing = false;
            $scope.faqs.sort( compareFaq );
          });
      }

      $scope.editFaq = function (index) {
        $scope.faqs[index].editing = true;
      }

      $scope.deleteFaq = function (index) {
        var faq = $scope.faqs[index];
        console.log("saving...")
        FaqService
          .delete(faq._id)
          .then(response => {
            console.log("doone...")
            console.log(response);
            $scope.faqs.splice(index, 1);
          });
      }

      $scope.submitPressed = function () {
        if ($('.ui.form').form('is valid')) {
          submitfaq();
        } else {
          swal("Uh oh!", "Please Fill The Required Fields", "error");
        }
      };

      function submitfaq(e) {
        FaqService
          .submitFaq(Session.getUserId(), $scope.question)
          .then(response => {
            $scope.question = ""
            swal("Thanks!", "We'll get back to you asap!", "success").then(value => {
              //$state.go("app.dashboard");
            });
          }, response => {
            swal("Uh oh!", "Something went wrong.", "error");
          });
      }
  }]);
