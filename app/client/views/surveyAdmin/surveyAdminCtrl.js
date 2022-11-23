const angular = require("angular");
const swal = require("sweetalert");

angular.module('reg')
  .controller('SurveyAdminCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    'currentUser',
    'settings',
    'Session',
    'UserService',
    'SurveyService',
    function($scope, $rootScope, $state, $http, currentUser, settings, Session, UserService, SurveyService) {

        $scope.users = [];

        $scope.surveys = [];

        $scope.surveyTotal = {};

        var surveyLoaded = false;
        var userLoaded = false;

        SurveyService
        .getAll()
        .then(response => {
          $scope.surveys = response.data;
          surveyLoaded = true;
          calculateStats();
        });

        UserService
        .getAll()
        .then(response => {
          $scope.users = response.data;
          userLoaded = true;
          calculateStats();
        });

        function calculateStats() {
            var total = {};
            for (var j = 0; j < $scope.surveys.length; j++) {
                console.log($scope.surveys[j])
                var surveyKey = $scope.surveys[j]._id;
                total[surveyKey] = 0;
            }
            if (!userLoaded || !surveyLoaded) { return false; }
            for (var i =0; i < $scope.users.length; i++) {
                var user = $scope.users[i];
                for (var j = 0; j < $scope.surveys.length; j++) {
                    var surveyKey = $scope.surveys[j]._id;
                    if (user.surveyAnswers && user.surveyAnswers[surveyKey]) {
                        total[surveyKey] += 1;
                    }
                }
            }
            $scope.surveyTotal = total;
        }

        $scope.updateSize = function() {
            $scope.settings.width = $scope.settingsNum.width + "px";
            $scope.settings.height = $scope.settingsNum.height + "px";
        }

        $scope.objClick = function(e, obj) {
            if ($scope.state === 'default') {
                $scope.state = 'objEdit';
                $scope.objEditState.selected = obj;
                $scope.objEditState.innerState = 'default';
            } else if ($scope.state === 'objEdit') {
                if ($scope.objEditState.innerState === 'default') {
                    $scope.objEditState.selected = obj;
                }
            }
        }

        $scope.addUserToTable = function(user) {
            user.tableid = $scope.objEditState.selected.data._id;
            UserService.updateTableId(user._id, user.tableid).then(response => {
                console.log("table updated");
            })
        }

        $scope.removeUserFromTable = function(user) {
            user.tableid = "_UNDEFINED_";
            UserService.updateTableId(user._id, user.tableid).then(response => {
                console.log("table updated");
            })
        }

        $scope.moveUserFromTable = function(user) {
            $scope.objEditState.selectedUser = user;
            $scope.objEditState.innerState = 'moveUser';
        }

        $scope.completeUserMove = function($event, obj) {
            var user = $scope.objEditState.selectedUser;
            user.tableid = obj.data._id;
            UserService.updateTableId(user._id, user.tableid).then(response => {
                $scope.objEditState.innerState = 'default';
            })
        }

        $scope.objSaveUsers = function($event, obj) {
            $scope.objEditState.innerState = 'default';
        }

        $scope.objAddUsers = function($event, obj) {
            $scope.objEditState.innerState = 'editUsers';
        }       

        $scope.objEditTableName = function($event, obj) {
            $scope.objEditState.innerState = 'editName';
        }

        $scope.objSaveTableName = function($event, obj) {
            var data = {
                tableid: obj.data.tableid
            }
            TableService.update(obj.data._id, data).then(response => {
                if (response && response.data) {
                }
                console.log("table updated");
            })
            $scope.objEditState.innerState = 'default';
        }

        $scope.objEditMove = function($event, obj) {
            if ($scope.objEditState.innerState === 'default') {
                $scope.objEditState.innerState = 'move';
                $scope.objEditState.selected = obj;
                obj.originLeft = Number(obj.style.left.replace(/[^\d.-]/g, '')) - $event.clientX;
                obj.originTop = Number(obj.style.top.replace(/[^\d.-]/g, '')) - $event.clientY;
            }
        }    

        $scope.objDoneMove = function($event, obj) {
            if ($scope.objEditState.innerState === 'move') {
                var data = {
                    left: obj.style.left,
                    top: obj.style.top,
                }
                TableService.update(obj.data._id, data).then(response => {
                    console.log("move updated");
                })
                $scope.objEditState.innerState = 'default';
            }
        }

        $scope.tableDisplayMouseDown = function(e) {
            console.log("table display mouse down");
            if ($scope.state === "create") {
                if ($scope.secondaryState !== 'postFirstPoint') {
                    var newElem = {};
                    newElem.style = {}
                    let rect = e.target.getBoundingClientRect();
                    newElem.style.top = (e.clientY - rect.top) + 'px';
                    newElem.style.left = (e.clientX - rect.left) + 'px';
                    newElem.originX = e.clientX;
                    newElem.originY = e.clientY;
                    newElem.style.width = 0 + 'px';
                    newElem.style.height = 0 + 'px';
                    console.log(newElem);
                    createState.currentElem = newElem;
                    newElem.type = 'table';
                    newElem.data = {
                        tableid: 'TableName'
                    }
                    // newElem.data.users = [];
                    $scope.elements.push(newElem);
                    $scope.secondaryState = 'postFirstPoint';
                }
                else {
                    var newElem = createState.currentElem;
                    var data = {
                        top: newElem.style.top,
                        left: newElem.style.left,
                        width: newElem.style.width,
                        height: newElem.style.height,
                        tableid: newElem.data.tableid
                    }
                    
                    TableService.update(undefined, data).then(response => {
                        if (response) {
                            newElem._id = response._id;
                        }
                        console.log("table updated");
                    })
                    $scope.secondaryState = 'default';
                    createState.currentElem = null;
                }
            }
        }

        $scope.tableDisplayMouseMove = function(e) {
            if ($scope.secondaryState === 'postFirstPoint') {
                var newElem = createState.currentElem;
                newElem.style.width = (e.clientX - newElem.originX) + 'px';
                newElem.style.height = (e.clientY - newElem.originY) + 'px';
            }
            else if ($scope.objEditState.innerState === "move") {
               var elem = $scope.objEditState.selected;
                elem.style.left = (elem.originLeft + e.clientX) + 'px';
                elem.style.top = (elem.originTop + e.clientY) + 'px';
            }
        }

        $scope.addElement = function() {
            $scope.state = "create";
        }
        $scope.doneAddElement = function() {
            $scope.state = "default";
        }

        $scope.deleteOrphan = function(key) {
            UserService.destroyUser(key).then(response => {
                console.log("detroyed orphan")
                delete $scope.orphanedGuests[key];
            })
        }
    }]);
