const moment = require('moment');
const swal = require('sweetalert');

angular.module('reg')
  .controller('AdminUsersCtrl',[
    '$scope',
    '$state',
    '$stateParams',
    '$sce',
    'AuthService',
    'UserService',
    'EmailService',
    function($scope, $state, $stateParams, $sce, AuthService, UserService, EmailService){

      $scope.pages = [];
      $scope.users = [];
      $scope.emailTemplates = [];
      $scope.selectedTemplateId = "";

      // Semantic-UI moves modal content into a dimmer at the top level.
      // While this is usually nice, it means that with our routing will generate
      // multiple modals if you change state. Kill the top level dimmer node on initial load
      // to prevent this.
      $('.ui.dimmer').remove();
      // Populate the size of the modal for when it appears, with an arbitrary user.
      $scope.selectedUser = {};
      $scope.selectedUser.sections = generateSections({status: '', confirmation: {
        dietaryRestrictions: []
      }, profile: ''});

      function refreshPage(data) {
        $scope.users = data.users;
        $scope.currentPage = data.page;
        $scope.pageSize = data.size;

        var p = [];
        for (var i = 0; i < data.totalPages; i++){
          p.push(i);
        }
        $scope.pages = p;
      }

      function loadUser(data, i, callback) {
        var user = data.users[i]
        var guests = user.guests
        if (guests.length > 0)
        {
          UserService.getGuestsById(user._id)
            .then(response => {
              console.log(response)
              data.users[i].guests = response.data
              callback(data);
            })
        }
        else {
          callback(data);
        }
      }

      function updatePage(data){
        var numCompleted = 0
        for (var i = 0; i < data.users.length; i++){
          loadUser(data, i, function(data){
            numCompleted += 1
            if (numCompleted == data.users.length)
            {
              refreshPage(data)
            }
          })
        }
      }

      UserService
        .getPage($stateParams.page, $stateParams.size, $stateParams.query)
        .then(response => {
          console.log(response.data)
          updatePage(response.data);
        });

      EmailService
        .getAll()
        .then(response => {
          console.log(response.data)
          if (response.data.length > 0) {
            $scope.selectedTemplateId = response.data[0]._id;
          }
          $scope.emailTemplates = response.data;
        });

      $scope.$watch('queryText', function(queryText){
        UserService
          .getPage($stateParams.page, $stateParams.size, queryText)
          .then(response => {
            updatePage(response.data);
          });
      });

      $scope.goToPage = function(page){
        $state.go('app.admin.users', {
          page: page,
          size: $stateParams.size || 50
        });
      };

      $scope.goUser = function($event, user){
        $event.stopPropagation();

        $state.go('app.admin.user', {
          id: user._id
        });
      };

      $scope.getCSV = function(){
        UserService.getCSV();
      };

      $scope.toggleVerify = function($event, user, index, guest_index) {
        $event.stopPropagation();

        var confirmationText = "Yes, verify them as our guest and send them next step email"
        if (!isNaN(guest_index))
        {
          confirmationText = "Yes, verify them as our guest. No email for guests"
        }

        if (!user.verified){
          swal({
            title: "Whoa, wait a minute!",
            text: "You are about verify " + user.profile.firstName + "!",
            icon: "warning",
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              checkIn: {
                className: "danger-button",
                closeModal: false,
                text: confirmationText,
                value: true,
                visible: true
              }
            }
          })
          .then(value => {
            if (!value) {
              return;
            }

            UserService
              .verify(user._id)
              .then(response => {
                if (!isNaN(guest_index))
                {
                  $scope.users[index].guests[guest_index] = response.data;
                  swal("Guest Verified", response.data.profile.firstName + " has been verified", "success");
                }
                else {
                  $scope.users[index] = response.data;
                  var email = $scope.users[index].email
                  console.log(email)
                  AuthService.sendUpdateEmail(email).then(res => {
                    console.log(res)
                    if (res.status && res.status == 200){
                      swal("Verified", response.data.profile.firstName + " has been verified and email has been sent.", "success");
                    }
                    else {
                      swal("Verified", response.data.profile.firstName + " has been verified but email failed to send.", "warning");
                    }
                  })
                }
              });
          });
        } else {
          UserService
            .unverify(user._id)
            .then(response => {
              $scope.users[index] = response.data;
              swal("Unverified", response.data.profile.firstName + ' has been unverified.', "success");
            });
        }
      };

      $scope.toggleCheckIn = function($event, user, index) {
        $event.stopPropagation();

        if (!user.status.checkedIn){
          swal({
            title: "Whoa, wait a minute!",
            text: "You are about to check in " + user.profile.name + "!",
            icon: "warning",
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              checkIn: {
                className: "danger-button",
                closeModal: false,
                text: "Yes, check them in",
                value: true,
                visible: true
              }
            }
          })
          .then(value => {
            if (!value) {
              return;
            }

            UserService
              .checkIn(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Accepted", response.data.profile.name + " has been checked in.", "success");
              });
          });
        } else {
          UserService
            .checkOut(user._id)
            .then(response => {
              $scope.users[index] = response.data;
              swal("Accepted", response.data.profile.name + ' has been checked out.', "success");
            });
        }
      };

      $scope.acceptUser = function($event, user, index) {
        $event.stopPropagation();

        console.log(user);

        swal({
          buttons: {
            cancel: {
              text: "Cancel",
              value: null,
              visible: true
            },
            accept: {
              className: "danger-button",
              closeModal: false,
              text: "Yes, accept them",
              value: true,
              visible: true
            }
          },
          dangerMode: true,
          icon: "warning",
          text: "You are about to accept " + user.profile.name + "!",
          title: "Whoa, wait a minute!"
        }).then(value => {
          if (!value) {
            return;
          }

          swal({
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              yes: {
                className: "danger-button",
                closeModal: false,
                text: "Yes, accept this user",
                value: true,
                visible: true
              }
            },
            dangerMode: true,
            title: "Are you sure?",
            text: "Your account will be logged as having accepted this user. " +
              "Remember, this power is a privilege.",
            icon: "warning"
          }).then(value => {
            if (!value) {
              return;
            }

            UserService
              .admitUser(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Accepted", response.data.profile.name + ' has been admitted.', "success");
              });
          });
        });
      };

      $scope.toggleAdmin = function($event, user, index) {
        $event.stopPropagation();

        if (!user.admin){
          swal({
            title: "Whoa, wait a minute!",
            text: "You are about make " + user.profile.firstName + " an admin!",
            icon: "warning",
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              confirm: {
                text: "Yes, make them an admin",
                className: "danger-button",
                closeModal: false,
                value: true,
                visible: true
              }
            }
          }).then(value => {
            if (!value) {
              return;
            }

            UserService
              .makeAdmin(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Made", response.data.profile.firstName + ' an admin.', "success");
              });
            }
          );
        } else {
          UserService
            .removeAdmin(user._id)
            .then(response => {
              console.log(response)
              $scope.users[index] = response.data;
              swal("Removed", response.data.profile.firstName + ' as admin', "success");
            });
        }
      };

      $scope.toggleTestAccount = function($event, user, index, guest_index) {
        $event.stopPropagation();

        var confirmationText = "Yes, mark as test user"

        if (!user.status.testAccount){
          swal({
            title: "Whoa, wait a minute!",
            text: "You are about to mark " + user.profile.firstName + " as a test Account!",
            icon: "warning",
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              checkIn: {
                className: "danger-button",
                closeModal: false,
                text: confirmationText,
                value: true,
                visible: true
              }
            }
          })
          .then(value => {
            if (!value) {
              return;
            }

            UserService
              .markTestUser(user._id)
              .then(response => {
                if (!isNaN(guest_index))
                {
                  $scope.users[index].guests[guest_index] = response.data;
                  swal("Guest Marked as test user", response.data.profile.firstName + " has been marked as test user", "success");
                }
                else {
                  $scope.users[index] = response.data;
                  swal("User Marked as test user", response.data.profile.firstName + " has been marked as test user", "success");
                }
              });
          });
        } else {
          UserService
            .unmarkTestUser(user._id)
            .then(response => {
              $scope.users[index] = response.data;
              swal("Unmarked as Test user", response.data.profile.firstName + ' has been unmarked as test user.', "success");
            });
        }
      };

      function formatTime(time){
        if (time) {
          return moment(time).format('MMMM Do YYYY, h:mm:ss a');
        }
      }

      $scope.rowClass = function(user) {
        if (!user) { return 'warning' }
        if (user.admin){
          return 'admin';
        }
        if (user.status.confirmed) {
          return 'positive';
        }
        if (user.status.admitted && !user.status.confirmed) {
          return 'warning';
        }
      };

      function selectUser(user){
        $scope.selectedUser = user;
        $scope.selectedUser.sections = generateSections(user);
        $('.long.user.modal')
          .modal('show');
      }

      function generateSections(user){
        return [
          {
            name: 'Basic Info',
            fields: [
              {
                name: 'Created On',
                value: formatTime(user.timestamp)
              },{
                name: 'Last Updated',
                value: formatTime(user.lastUpdated)
              },{
                name: 'Confirm By',
                value: formatTime(user.status.confirmBy) || 'N/A'
              },{
                name: 'Checked In',
                value: formatTime(user.status.checkInTime) || 'N/A'
              },{
                name: 'Email',
                value: user.email
              },{
                name: 'Team',
                value: user.teamCode || 'None'
              }
            ]
          },{
            name: 'Profile',
            fields: [
              {
                name: 'Name',
                value: user.profile.name
              },{
                name: 'Gender',
                value: user.profile.gender
              },{
                name: 'Description',
                value: user.profile.description
              },{
                name: 'Essay',
                value: user.profile.essay
              }
            ]
          },{
            name: 'Confirmation',
            fields: [
              {
                name: 'Phone Number',
                value: user.confirmation.phoneNumber
              },{
                name: 'Dietary Restrictions',
                value: user.confirmation.dietaryRestrictions.join(', ')
              },{
                name: 'Shirt Size',
                value: user.confirmation.shirtSize
              },{
                name: 'Major',
                value: user.confirmation.major
              },{
                name: 'Github',
                value: user.confirmation.github
              },{
                name: 'Website',
                value: user.confirmation.website
              },{
                name: 'Needs Hardware',
                value: user.confirmation.wantsHardware,
                type: 'boolean'
              },{
                name: 'Hardware Requested',
                value: user.confirmation.hardware
              }
            ]
          },{
            name: 'Hosting',
            fields: [
              {
                name: 'Needs Hosting Friday',
                value: user.confirmation.hostNeededFri,
                type: 'boolean'
              },{
                name: 'Needs Hosting Saturday',
                value: user.confirmation.hostNeededSat,
                type: 'boolean'
              },{
                name: 'Gender Neutral',
                value: user.confirmation.genderNeutral,
                type: 'boolean'
              },{
                name: 'Cat Friendly',
                value: user.confirmation.catFriendly,
                type: 'boolean'
              },{
                name: 'Smoking Friendly',
                value: user.confirmation.smokingFriendly,
                type: 'boolean'
              },{
                name: 'Hosting Notes',
                value: user.confirmation.hostNotes
              }
            ]
          },{
            name: 'Travel',
            fields: [
              {
                name: 'Needs Reimbursement',
                value: user.confirmation.needsReimbursement,
                type: 'boolean'
              },{
                name: 'Received Reimbursement',
                value: user.confirmation.needsReimbursement && user.status.reimbursementGiven
              },{
                name: 'Address',
                value: user.confirmation.address ? [
                  user.confirmation.address.line1,
                  user.confirmation.address.line2,
                  user.confirmation.address.city,
                  ',',
                  user.confirmation.address.state,
                  user.confirmation.address.zip,
                  ',',
                  user.confirmation.address.country,
                ].join(' ') : ''
              },{
                name: 'Additional Notes',
                value: user.confirmation.notes
              }
            ]
          }
        ];
      }

      $scope.selectUser = selectUser;

      $scope.previewEmailForUser = function() {
        console.log("generating preview...")
        console.log($scope.selectedUser)
        EmailService.preview($scope.selectedTemplateId, $scope.selectedUser._id).then(response => {
          console.log(response);
          if (response && response.data) {
            $scope.previewData = $sce.trustAsHtml(response.data);
          }
        })
      }

      $scope.sendEmailForUser = function() {
        console.log("sending email...")
        console.log($scope.selectedUser)
        EmailService.send($scope.selectedTemplateId, $scope.selectedUser._id).then(response => {
          console.log(response);
          console.log("yay")
          swal("Email Sent", "email has been sent", "success");
        })
      }

      $scope.getEmailInfo = function(event, user, temp) {
        $scope.selectedTemplateId = temp._id;
      }
    }]);
