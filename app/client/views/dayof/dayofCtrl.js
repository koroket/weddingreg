angular.module('reg')
  .controller('DayofCtrl', [
    '$scope',
    function($scope){

      $scope.selectedTab = "Games"

      $scope.tabs = [{
        _id: "Games"
      },{
        _id: "Photobooth"
      },{
        _id: "Schedule"
      },{
        _id: "Beverages"
      },{
        _id: "Notes"
      }];

      $scope.selectTab = function (tabid) {
        $scope.selectedTab = tabid
      }
    }]);
