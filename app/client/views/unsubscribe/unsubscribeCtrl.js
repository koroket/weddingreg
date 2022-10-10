const swal = require('sweetalert');

angular.module('reg')
  .controller('UnsubscribeCtrl', [
    '$scope',
    '$stateParams',
    '$state',
    'AuthService',
    function($scope, $stateParams, $state, AuthService){
      $scope.loading = true;
    }]);
