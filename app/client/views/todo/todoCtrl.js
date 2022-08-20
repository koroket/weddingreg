const angular = require("angular");
const swal = require("sweetalert");

angular.module('reg')
  .controller('TodoCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    'currentUser',
    'settings',
    'Session',
    'UserService',
    function($scope, $rootScope, $state, $http, currentUser, settings, Session, UserService) {
    }]);
