const angular = require("angular");
const swal = require("sweetalert");

angular.module('reg')
  .controller('TableCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    'currentUser',
    'settings',
    'Session',
    'UserService',
    'TableService',
    function($scope, $rootScope, $state, $http, currentUser, settings, Session, UserService, TableService) {
        $scope.state = 'default';
        $scope.secondaryState = 'default';
        $scope.elements = [];
        $scope.objEditState = {};
        $scope.objEditState.innerState = 'default';
        $scope.settings = {
            width: "800px",
            height: "1200px"
        };
        $scope.settingsNum = {
            width: 800,
            height: 1200
        }
        var createState = {};

        $scope.users = [];
        $scope.elementMap = {};

        function verifyOrphanedGuests(users){
            var orphanedGuests = {}
            console.log("orphans...")
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                if (!user.email) {
                    orphanedGuests[user.id] = user;
                }
            }
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                for (var j = 0; j < user.guests.length; j++) {
                    var guest = user.guests[j];
                    delete orphanedGuests[guest];
                }
            }
            console.log(orphanedGuests);
            $scope.orphanedGuests = orphanedGuests;
        }

        UserService
        .getAll()
        .then(response => {
          console.log(response.data)
          verifyOrphanedGuests(response.data);
          var filtered = response.data.filter(function(user) {
              if (!user.status.declined &&
                  !user.status.testAccount)
              {
                  return true;
              }
              return false;
          })
          console.log(filtered)
          $scope.users = filtered;
        });

        TableService.getAll().then(response => {
            console.log(response.data);
            for (var i = 0; i < response.data.length; i++){
                var tData = response.data[i];
                var newElem = {};
                newElem.style = {}
                newElem.style.top = tData.top;
                newElem.style.left = tData.left;
                newElem.style.width = tData.width;
                newElem.style.height = tData.height;
                newElem.type = 'table';
                newElem.data = {
                    tableid: tData.tableid,
                    _id: tData._id
                }
                $scope.elementMap[tData._id] = newElem;
                console.log("hello")
                console.log(newElem)
                $scope.elements.push(newElem);
            }
        })

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
