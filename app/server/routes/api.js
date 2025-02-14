var UserController = require('../controllers/UserController');
var SettingsController = require('../controllers/SettingsController');
var FaqController = require('../controllers/FaqController');
var EmailController = require('../controllers/EmailController');
var TableController = require('../controllers/TableController');
var SurveyController = require('../controllers/SurveyController');
var User = require('../models/User');
var json2csv = require('json2csv').parse;
var path = require('path');

var request = require('request');
var multer          = require('multer')
var upload          = multer()

module.exports = function(router) {

  function getToken(req){
    return req.headers['x-access-token'];
  }

  /**
   * Using the access token provided, check to make sure that
   * you are, indeed, an admin.
   */
  function isAdmin(req, res, next){

    var token = getToken(req);

    UserController.getByToken(token, function(err, user){

      if (err) {
        return res.status(500).send(err);
      }

      if (user && user.admin){
        req.user = user;
        return next();
      }

      return res.status(401).send({
        message: 'Get outta here, punk!'
      });

    });
  }

  /**
   * [Users API Only]
   *
   * Check that the id param matches the id encoded in the
   * access token provided.
   *
   * That, or you're the admin, so you can do whatever you
   * want I suppose!
   */
  function isOwnerOrAdmin(req, res, next){
    var token = getToken(req);
    var userId = req.params.id;

    UserController.getByToken(token, function(err, user){

      if (err || !user) {
        return res.status(500).send(err);
      }

      if (user._id == userId || user.admin){
        return next();
      }
      for (var i = 0; i < user.guests.length; i++) {
        if (user.guests[i] == userId) {
          console.log("is guest owner!")
          return next();
        }
      }
      return res.status(400).send({
        message: 'Token does not match user id.'
      });
    });
  }

  function isLoggedIn(req, res, next){
    var token = getToken(req);

    UserController.getByToken(token, function(err, user){

      if (err || !user) {
        return res.status(500).send(err);
      }

      return next();
    });
  }

  /**
   * Default response to send an error and the data.
   * @param  {[type]} res [description]
   * @return {[type]}     [description]
   */
  function defaultResponse(req, res){
    return function(err, data){
      if (err){
        // SLACK ALERT!
        if (process.env.NODE_ENV === 'production'){
          request
            .post(process.env.SLACK_HOOK,
              {
                form: {
                  payload: JSON.stringify({
                    "text":
                    "``` \n" +
                    "Request: \n " +
                    req.method + ' ' + req.url +
                    "\n ------------------------------------ \n" +
                    "Body: \n " +
                    JSON.stringify(req.body, null, 2) +
                    "\n ------------------------------------ \n" +
                    "\nError:\n" +
                    JSON.stringify(err, null, 2) +
                    "``` \n"
                  })
                }
              },
              function (error, response, body) {
                return res.status(500).send({
                  message: "Your error has been recorded, we'll get right on it!"
                });
              }
            );
        } else {
          return res.status(500).send(err);
        }
      } else {
        return res.json(data);
      }
    };
  }

  /**
   *  API!
   */

  // ---------------------------------------------
  // Users
  // ---------------------------------------------

  /**
   * [ADMIN ONLY]
   *
   * GET - Get all users, or a page at a time.
   * ex. Paginate with ?page=0&size=100
   */
  router.get('/users', isAdmin, function(req, res){
    var query = req.query;

    if (query.page && query.size){

      UserController.getPage(query, defaultResponse(req, res));

    } else {

      UserController.getAll(defaultResponse(req, res));

    }
  });

  /**
   * [ADMIN ONLY]
   */
  router.get('/users/stats', isAdmin, function(req, res){
    UserController.getStats(defaultResponse(req, res));
  });

  router.get('/users/exportcsv', isAdmin, function(req, res, next){
    function timeStamp() {
      // Create a date object with the current time
      var now = new Date();
       // Create an array with the current month, day and time
      var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

        // Create an array with the current hour, minute and second
      var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

       // Determine AM or PM suffix based on the hour
      var suffix = ( time[0] < 12 ) ? "AM" : "PM";

       // Convert hour from military time
      time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

       // If hour is 0, set it to 12
      time[0] = time[0] || 12;

       // If seconds and minutes are less than 10, add a zero
      for ( var i = 1; i < 3; i++ ) {
        if ( time[i] < 10 ) {
          time[i] = "0" + time[i];
        }
      }

       // Return the formatted string
      return '_'+date.join("-") + "_" + time.join("-") + "_" + suffix;
    }

    var filename = "export_quill_users" + timeStamp() + ".csv";

    var fields = ['_id','email','verified','timestamp','lastUpdated',
                  'profile.adult','profile.name',
                  'profile.gender',
                  'profile.description','profile.essay','status.name',
                  'status.completedProfile','status.admitted',
                  'status.confirmed','status.declined','status.checkedIn',
                  'status.reimbursementGiven',
                ];
    var fs = require('fs');

    User.find({}, function (err, users_data) {
      if (err) {
        return res.status(501).json({err});
      }
      else {
        let csv;
        try {
          csv = json2csv(users_data, {fields});
        } catch (err) {
          console.log(err);
          return res.status(502).json({err});
        }
        const filePath = path.join(__dirname, "../..","client","assets",filename);
        fs.writeFile(filePath, csv, function (err) {
          if (err) {
            return res.json(err).status(503);
          }
          else {
            setTimeout(function () {
              fs.unlinkSync(filePath);
            }, 30000);
            return res.json({
              path: "/assets/" + filename,
              filename: filename
            });
          }
        });
      }
    });
  });

  /**
   * [OWNER/ADMIN]
   *
   * GET - Get a specific user.
   */
  router.get('/users/:id', isOwnerOrAdmin, function(req, res){
    UserController.getById(req.params.id, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * PUT - Update a specific user's profile.
   */
  router.put('/users/:id/profile', isOwnerOrAdmin, function(req, res){
    var profile = req.body.profile;
    var id = req.params.id;
    console.log("api.js:" + req.body.guests)
    var guests = JSON.parse(req.body.guests)
    console.log("api.js:" + guests)
    UserController.updateProfileAndGuests(id, profile, guests, defaultResponse(req, res));
  });

  router.put('/users/:id/dining', isOwnerOrAdmin, function(req, res){
    var diningOption = req.body.diningOption;
    var id = req.params.id;
    UserController.updateDining(id, diningOption, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * PUT - Update a specific user's confirmation information.
   */
  router.put('/users/:id/confirm', isOwnerOrAdmin, function(req, res){
    var confirmation = req.body.confirmation;
    var id = req.params.id;

    UserController.updateConfirmationById(id, confirmation, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * POST - Decline an acceptance.
   */
  router.post('/users/:id/vaccine', upload.single('file'), isOwnerOrAdmin, function(req, res){
    var vaccineFile = req.file;
    var id = req.params.id;

    UserController.updateVaccine(id, vaccineFile, defaultResponse(req, res));
  });

  router.post('/users/:id/covidtest', upload.single('file'), isOwnerOrAdmin, function(req, res){
    var covidTestFile = req.file;
    var id = req.params.id;

    UserController.updateCovidTest(id, covidTestFile, defaultResponse(req, res));
  });

  /**
   * [OWNER/ADMIN]
   *
   * POST - Decline an acceptance.
   */
  router.post('/users/:id/decline', isOwnerOrAdmin, function(req, res){
    var confirmation = req.body.confirmation;
    var id = req.params.id;

    UserController.declineById(id, defaultResponse(req, res));
  });

  /**
   * Get a user's team member's names. Uses the code associated
   * with the user making the request.
   */
  router.get('/users/:id/team', isOwnerOrAdmin, function(req, res){
    var id = req.params.id;
    UserController.getTeammates(id, defaultResponse(req, res));
  });

  /**
   * Get a user's guests
   */
  router.get('/users/:id/guests', isOwnerOrAdmin, function(req, res){
    var id = req.params.id;
    UserController.getGuests(id, defaultResponse(req, res));
  });

  router.put('/users/:id/table', isAdmin, function(req, res){
    var tableid = req.body.tableid;
    var id = req.params.id;

    UserController.updateTable(id, tableid, defaultResponse(req, res));

  });

  /**
   * Update a teamcode. Join/Create a team here.
   * {
   *   code: STRING
   * }
   */
  router.put('/users/:id/team', isOwnerOrAdmin, function(req, res){
    var code = req.body.code;
    var id = req.params.id;

    UserController.createOrJoinTeam(id, code, defaultResponse(req, res));

  });

  /**
   * Remove a user from a team.
   */
  router.delete('/users/:id/team', isOwnerOrAdmin, function(req, res){
    var id = req.params.id;

    UserController.leaveTeam(id, defaultResponse(req, res));
  });

  /**
   * Update a user's password.
   * {
   *   oldPassword: STRING,
   *   newPassword: STRING
   * }
   */
  router.put('/users/:id/password', isOwnerOrAdmin, function(req, res){
    return res.status(304).send();
    // Currently disable.
    // var id = req.params.id;
    // var old = req.body.oldPassword;
    // var pass = req.body.newPassword;

    // UserController.changePassword(id, old, pass, function(err, user){
    //   if (err || !user){
    //     return res.status(400).send(err);
    //   }
    //   return res.json(user);
    // });
  });

  router.get('/dbaccesstoken', isAdmin, function(req, res){
    defaultResponse(req,res)(null, global.dropbox_access_token)
  })

  router.get('/emailTemplates', isAdmin, function(req, res){
    return EmailController.getTemplates(defaultResponse(req, res));
  })

  router.get('/emailTemplates/:name', isAdmin, function(req, res){
    var name = req.params.name
    return EmailController.getTemplateByName(name, defaultResponse(req, res));
  })

  router.put('/emailTemplates/update', isAdmin, function(req, res){
    console.log("test")
    var id = req.body._id;
    var name = req.body.name;
    var subject = req.body.subject;
    var data = req.body.data
    var textData = req.body.textData;
    var imageurl = req.body.imageurl
    var loadGuests = req.body.loadGuests;
    if (loadGuests === 'true') {
      loadGuests = true
    }
    var trackInAdmin = req.body.trackInAdmin;
    if (trackInAdmin === 'true') {
      trackInAdmin = true
    }
    return EmailController.updateById(id, name, subject, imageurl, loadGuests, trackInAdmin, data, textData, defaultResponse(req, res));
  });

  router.put('/emailTemplates/preview/:id', isAdmin, function(req, res){
    var id = req.params.id;
    var uid = req.body.uid;
    if (!uid) {
      uid = req.user._id;
    }
    UserController.previewEmail(uid, id, defaultResponse(req, res))
  })

  router.put('/emailTemplates/sendEmail/:id', isAdmin, function(req, res){
    var id = req.params.id;
    var uid = req.body.uid;
    if (!uid) {
      uid = req.user._id;
    }
    UserController.sendTemplateEmail(uid, id, defaultResponse(req, res))
  })

  router.get('/faqs', isLoggedIn, function(req, res){
    return FaqController.getFaqs(defaultResponse(req, res));
  });

  router.put('/faqs/update', isAdmin, function(req, res){
    var id = req.body._id;
    var question = req.body.question;
    var answer = req.body.answer;
    var position = req.body.position
    var unanswered = false;
    var originator = "";
    return FaqController.updateById(id, question, answer, position, unanswered, originator, defaultResponse(req, res));
  });

  router.put('/faqs/submit', isLoggedIn, function(req, res){
    var id = undefined;
    var question = req.body.question;
    var answer = "";
    var position = 0;
    var unanswered = true;
    var originator = req.body._id;
    return FaqController.updateById(id, question, answer, position, unanswered, originator, defaultResponse(req, res));
  });

  router.put('/faqs/delete', isAdmin, function(req, res){
    var id = req.body._id;
    return FaqController.deleteById(id, defaultResponse(req, res));
  });

  // SURVEY

  router.get('/surveys', isLoggedIn, function(req, res){
    return SurveyController.getSurveys(defaultResponse(req, res));
  });

  router.put('/surveys/update', isAdmin, function(req, res){
    var id = req.body._id;
    var question = req.body.question;
    return SurveyController.updateById(id, question, defaultResponse(req, res));
  });

  router.put('/users/:id/submitAnswers', isOwnerOrAdmin, function(req, res){
    console.log("submit answers")
    var id = req.params.id;
    var answers = req.body.surveyAnswers;
    return SurveyController.updateAnswersForUser(id, answers, defaultResponse(req, res));
  });

  router.put('/surveys/delete', isAdmin, function(req, res){
    var id = req.body._id;
    return SurveyController.deleteById(id, defaultResponse(req, res));
  });

  /**
   * Admit a user. ADMIN ONLY, DUH
   *
   * Also attaches the user who did the admitting, for liabaility.
   */
  router.post('/users/:id/admit', isAdmin, function(req, res){
    // Accept the hacker. Admin only
    var id = req.params.id;
    var user = req.user;
    UserController.admitUser(id, user, defaultResponse(req, res));
  });

  /**
   * Check in a user. ADMIN ONLY, DUH
   */
  router.post('/users/:id/verify', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.verifyById(id, user, defaultResponse(req, res));
  });

  /**
   * Check in a user. ADMIN ONLY, DUH
   */
  router.post('/users/:id/unverify', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.unverifyById(id, user, defaultResponse(req, res));
  });

  /**
   * Check in a user. ADMIN ONLY, DUH
   */
  router.post('/users/:id/checkin', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.checkInById(id, user, defaultResponse(req, res));
  });

  /**
   * Check in a user. ADMIN ONLY, DUH
   */
  router.post('/users/:id/checkout', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.checkOutById(id, user, defaultResponse(req, res));
  });

  router.post('/users/:id/markTestUser', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.markTestAccount(id, user, defaultResponse(req, res));
  });

  router.post('/users/:id/unmarkTestUser', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.unmarkTestAccount(id, user, defaultResponse(req, res));
  });

  /**
   * Make user an admin
   */
  router.post('/users/:id/makeadmin', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.makeAdminById(id, user, defaultResponse(req, res));
  });

  /**
   * Demote user
   */
  router.post('/users/:id/removeadmin', isAdmin, function(req, res){
    var id = req.params.id;
    var user = req.user;
    UserController.removeAdminById(id, user, defaultResponse(req, res));
  });

  router.post('/users/:id/destroy', isAdmin, function(req, res) {
    var id = req.params.id;
    UserController.removeById(id, defaultResponse(req, res));
  });


  // ---------------------------------------------
  // Settings [ADMIN ONLY!]
  // ---------------------------------------------

  /**
   * Get the public settings.
   * res: {
   *   timeOpen: Number,
   *   timeClose: Number,
   *   timeToConfirm: Number,
   *   acceptanceText: String,
   *   confirmationText: String,
   *   allowMinors: Boolean
   * }
   */
  router.get('/settings', function(req, res){
    SettingsController.getPublicSettings(defaultResponse(req, res));
  });

  /**
   * Update the acceptance text.
   * body: {
   *   text: String
   * }
   */
  router.put('/settings/waitlist', isAdmin, function(req, res){
    var text = req.body.text;
    SettingsController.updateField('waitlistText', text, defaultResponse(req, res));
  });

  /**
   * Update the acceptance text.
   * body: {
   *   text: String
   * }
   */
  router.put('/settings/acceptance', isAdmin, function(req, res){
    var text = req.body.text;
    SettingsController.updateField('acceptanceText', text, defaultResponse(req, res));
  });

  /**
   * Update the confirmation text.
   * body: {
   *   text: String
   * }
   */
  router.put('/settings/confirmation', isAdmin, function(req, res){
    var text = req.body.text;
    SettingsController.updateField('confirmationText', text, defaultResponse(req, res));
  });

  /**
   * Update the confirmation date.
   * body: {
   *   time: Number
   * }
   */
  router.put('/settings/confirm-by', isAdmin, function(req, res){
    var time = req.body.time;
    SettingsController.updateField('timeConfirm', time, defaultResponse(req, res));
  });

  /**
   * Set the registration open and close times.
   * body : {
   *   timeOpen: Number,
   *   timeClose: Number
   * }
   */
  router.put('/settings/times', isAdmin, function(req, res){
    var open = req.body.timeOpen;
    var close = req.body.timeClose;
    SettingsController.updateRegistrationTimes(open, close, defaultResponse(req, res));
  });

  /**
   * Get the whitelisted emails.
   *
   * res: {
   *   emails: [String]
   * }
   */
  router.get('/settings/whitelist', isAdmin, function(req, res){
    SettingsController.getWhitelistedEmails(defaultResponse(req, res));
  });

  /**
   * [ADMIN ONLY]
   * {
   *   emails: [String]
   * }
   * res: Settings
   *
   */
  router.put('/settings/whitelist', isAdmin, function(req, res){
    var emails = req.body.emails;
    SettingsController.updateWhitelistedEmails(emails, defaultResponse(req, res));
  });

  /**
   * [ADMIN ONLY]
   * {
   *   allowMinors: Boolean
   * }
   * res: Settings
   *
   */
  router.put('/settings/minors', isAdmin, function(req, res){
    var allowMinors = req.body.allowMinors;
    SettingsController.updateField('allowMinors', allowMinors, defaultResponse(req, res));
  });

  router.get('/tables', isAdmin, function(req, res){
    return TableController.getTables(defaultResponse(req, res));
  });

  router.put('/tables/update', isAdmin, function(req, res){
    var id = req.body._id;
    var updateData = req.body.updateData;
    return TableController.updateById(id, updateData, defaultResponse(req, res));
  });
};
