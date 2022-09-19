angular.module('reg')
  .controller('AdminCtrl', [
    '$scope',
    'UserService',
    'AuthService',
    'currentUser',
    function ($scope, UserService, AuthService, currentUser) {
      $scope.loading = true;

      $scope.user = currentUser.data;

      $scope.sendUpdateEmail = function () {
        var email = $scope.user.email
        console.log(email)
        AuthService.sendUpdateEmail(email).then(res => {
          console.log(res)
        })
      };

    }]);
