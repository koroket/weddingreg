var _ = require('underscore');
var User = require('../models/User');
var Settings = require('../models/Settings');
var EmailTemplate = require('../models/EmailTemplate');
var Mailer = require('../services/email');
var Stats = require('../services/stats');

var validator = require('validator');
var moment = require('moment');
const https = require("https");
const stream = require('stream');

var UserController = {};

var maxTeamSize = process.env.TEAM_MAX_SIZE || 4;


// Tests a string if it ends with target s
function endsWith(s, test) {
  return test.indexOf(s, test.length - s.length) !== -1;
}

// Title case a str
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Determine whether or not a user can register.
 * @param  {String}   email    Email of the user
 * @param  {Function} callback args(err, true, false)
 * @return {[type]}            [description]
 */
function canRegister(email, password, callback) {

  if (!password || password.length < 6) {
    return callback({ message: "Password must be 6 or more characters." }, false);
  }

  // Check if its within the registration window.
  Settings.getRegistrationTimes(function (err, times) {
    if (err) {
      callback(err);
    }

    var now = Date.now();

    if (now < times.timeOpen) {
      return callback({
        message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
      });
    }

    if (now > times.timeClose) {
      return callback({
        message: "Sorry, registration is closed."
      });
    }

    // Check for emails.
    // Settings.getWhitelistedEmails(function(err, emails){
    //   if (err || !emails){
    //     return callback(err);
    //   }
    if (validator.isEmail(email)) {
      return callback(null, true);
    }
    else {
      return callback({
        message: "Not a valid email"
      }, false);
    }
    // });

  });
}

/**
 * Login a user given a token
 * @param  {String}   token    auth token
 * @param  {Function} callback args(err, token, user)
 */
UserController.loginWithToken = function (token, callback) {
  User.getByToken(token, function (err, user) {
    return callback(err, token, user);
  });
};

/**
 * Login a user given an email and password.
 * @param  {String}   email    Email address
 * @param  {String}   password Password
 * @param  {Function} callback args(err, token, user)
 */
UserController.loginWithPassword = function (email, password, callback) {

  if (!password || password.length === 0) {
    return callback({
      message: 'Please enter a password'
    });
  }

  if (!validator.isEmail(email)) {
    return callback({
      message: 'Invalid email'
    });
  }

  User
    .findOneByEmail(email)
    .select('+password')
    .exec(function (err, user) {
      if (err) {
        return callback(err);
      }
      if (!user) {
        return callback({
          message: "We couldn't find you!"
        });
      }
      if (!user.checkPassword(password)) {
        return callback({
          message: "That's not the right password."
        });
      }

      // yo dope nice login here's a token for your troubles
      var token = user.generateAuthToken();

      var u = user.toJSON();

      delete u.password;

      return callback(null, token, u);
    });
};

function updatePlusOne(user, guests, index, guest_ids, callback) {
  if (index < guests.length) {
    UserController.updateProfileById(guests[index]._id, guests[index].profile, function (err, res) {
      if (err) {
        console.log(err);
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback(user, guest_ids, {
            message: 'error occurred for processing plus ones'
          });
        }

        return callback(user, guest_ids, err);
      } else {
        console.log("guest " + index + " updated!")
        console.log("guests[index]._id")
        guest_ids.push(guests[index]._id);
        return updatePlusOne(user, guests, index + 1, guest_ids, callback)
      }
    });
  }
  else {
    console.log("done updating guests")
    callback(user, guest_ids, undefined);
  }
}

function createPlusOne(user, guests, index, guest_ids, callback) {
  if (index < guests.length) {
    var guest = new User();
    guest.profile = {};
    if (!guests[index].firstName) {
      guests[index].firstName = ""
    }
    if (!guests[index].lastName) {
      guests[index].lastName = ""
    }
    guest.profile.firstName = toTitleCase(guests[index].firstName)
    guest.profile.lastName = toTitleCase(guests[index].lastName)
    guest.profile.owner = user._id
    guest.save(function (err) {
      if (err) {
        console.log(err)
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback(user, guest_ids, {
            message: 'Account created but error occurred for processing plus ones'
          });
        }

        return callback(user, guest_ids, err);
      } else {
        console.log("guest " + index + " created!")
        guest_ids.push(guest._id);
        console.log(guest._id)
        return createPlusOne(user, guests, index + 1, guest_ids, callback)
      }
    });
  }
  else {
    console.log("done generating guests")
    callback(user, guest_ids, undefined);
  }
}

/**
 * Create a new user given an email and a password.
 * @param  {String}   email    User's email.
 * @param  {String}   password [description]
 * @param  {Function} callback args(err, user)
 */
UserController.createUser = function (email, password, firstName,
  lastName, evntCode, guests, callback) {
  console.log(guests)
  evntCode = evntCode.toLowerCase();
  if (evntCode !== "weddingshower") {
    return callback({
      message: "Invalid Event Code"
    });
  }

  if (typeof email !== "string") {
    return callback({
      message: "Email must be a string."
    });
  }

  email = email.toLowerCase();

  // Check that there isn't a user with this email already.
  canRegister(email, password, function (err, valid) {

    if (err || !valid) {
      return callback(err);
    }

    var u = new User();
    u.email = email;
    u.password = User.generateHash(password);
    u.profile.firstName = toTitleCase(firstName)
    u.profile.lastName = toTitleCase(lastName)
    u.evntCode = evntCode
    u.save(function (err) {
      if (err) {
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback({
            message: 'An account for this email already exists.'
          });
        }

        return callback(err);
      } else {
        // yay! success.
        console.log("account created")
        return createPlusOne(u, guests, 0, [], function (cbuser, guest_ids, err) {
          cbuser.guests = guest_ids
          console.log("saving guest ids = " + cbuser.guests);
          console.log(cbuser)
          cbuser.save(function (err) {
            if (err) {
              console.log(err)
              // Duplicate key error codes
              if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
                return callback({
                  message: 'An account for this email already exists.'
                });
              }

              return callback(err);
            } else {
              console.log("guests created, sending email")
              var token = cbuser.generateAuthToken();

              Mailer.sendPostAcceptance(cbuser, function(err, res){
                return callback(
                  null,
                  {
                    token: token,
                    user: cbuser
                  }
                );
              });
            }
          })
        })
      }

    });
  });
};

UserController.getByToken = function (token, callback) {
  User.getByToken(token, callback);
};

/**
 * Get all users.
 * It's going to be a lot of data, so make sure you want to do this.
 * @param  {Function} callback args(err, user)
 */
UserController.getAll = function (callback) {
  User.find({}, callback);
};

/**
 * Get a page of users.
 * @param  {[type]}   page     page number
 * @param  {[type]}   size     size of the page
 * @param  {Function} callback args(err, {users, page, totalPages})
 */
UserController.getPage = function (query, callback) {
  var page = query.page;
  var size = parseInt(query.size);
  var searchText = query.text;

  var findQuery = {};

  var andQuery = []
  andQuery.push({
    'email' : { $exists: true }
  })
  if (searchText.length > 0){
    var orQuery = {}
    var queries = [];
    var re = new RegExp(searchText, 'i');
    queries.push({ email: re });
    queries.push({ 'profile.firstName': re });
    queries.push({ 'profile.lastName': re });
    orQuery.$or = queries;
    andQuery.push(orQuery)
  }
  findQuery.$and = andQuery

  User
    .find(findQuery)
    .sort({
      'profile.firstName': 'asc'
    })
    .select('+status.admittedBy')
    .skip(page * size)
    .limit(size)
    .exec(function (err, users) {
      if (err || !users) {
        return callback(err);
      }

      User.count(findQuery).exec(function (err, count) {

        if (err) {
          return callback(err);
        }

        return callback(null, {
          users: users,
          page: page,
          size: size,
          totalPages: Math.ceil(count / size)
        });
      });

    });
};

/**
 * Get a user by id.
 * @param  {String}   id       User id
 * @param  {Function} callback args(err, user)
 */
UserController.getById = function (id, callback) {
  User.findById(id).exec(callback);
};

UserController.uploadToDropbox = function(file, path, callback) {

  const req = https.request('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + global.dropbox_access_token,
      'Dropbox-API-Arg': JSON.stringify({
        'path': path,
        'mode': 'overwrite',
        'autorename': true, 
        'mute': false,
        'strict_conflict': false
      }),
        'Content-Type': 'application/octet-stream',
    }
  }, (res) => {
    if (res.status && res.status != 200) {
      console.log(res.status)
      console.log(res)
      return callback("Server can not complete upload", undefined)
    }

    res.on('data', function(d) {
      process.stdout.write(d);
    }).on('end', function () {
      if (res.statusCode != 200) {
        console.log(res)
        return callback("Server can not complete upload of your file :(", undefined)
      }
      else {
        return callback(undefined, {"res":"good"})
      }
    })
  });
  req.on('error', function(e){
    console.log(e);
    callback("Server can not complete upload", undefined)
  })
  req.write(file.buffer);
  req.end();
}

UserController.updateVaccine = function(id, vaccineFile, callback){
  console.log("UserController.updateVaccine: ")
  console.log(vaccineFile)

  // const bufferStream = new stream.PassThrough();
  // bufferStream.end(vaccineFile.buffer);

  if (vaccineFile.size > 10000000) {
    return callback("File too large", undefined)
  }

  var original_file_name = ""
  if (vaccineFile && vaccineFile.originalname){
    original_file_name = vaccineFile.originalname
  }
  else{
    original_file_name = "vaccine.undefined"
  }

  var unique_file_name = id + "_" + original_file_name
  var uploadPath = '/Vaccination/' + unique_file_name
  UserController.uploadToDropbox(vaccineFile, uploadPath, function (err, res) {
    if (err) {
      return callback("Server can not complete upload", undefined)
    }
    User.findOneAndUpdate({
        _id: id
      },
        {
          $set: {
            'vaccineRef': unique_file_name,
            'status.uploadedVaccine': true
          }
        },
        {
          new: true
        },
        callback);
  })
}

UserController.updateCovidTest = function(id, vaccineFile, callback){
  console.log("UserController.updateCovidTest: ")
  console.log(vaccineFile)

  // const bufferStream = new stream.PassThrough();
  // bufferStream.end(vaccineFile.buffer);

  if (vaccineFile.size > 10000000) {
    return callback("File too large", undefined)
  }

  var original_file_name = ""
  if (vaccineFile && vaccineFile.originalname){
    original_file_name = vaccineFile.originalname
  }
  else{
    original_file_name = "covidtest.undefined"
  }

  var unique_file_name = id + "_" + original_file_name
  var uploadPath = '/Covidtest/' + unique_file_name
  UserController.uploadToDropbox(vaccineFile, uploadPath, function (err, res) {
    if (err) {
      return callback("Server can not complete upload", undefined)
    }
    User.findOneAndUpdate({
        _id: id
      },
        {
          $set: {
            'covidtestRef': unique_file_name,
            'status.uploadedCovidTest': true
          }
        },
        {
          new: true
        },
        callback);
  })
}

UserController.updateProfileAndGuests = function (id, profile, guests, callback) {
  console.log("UserController.updateProfileAndGuests: ")
  console.log(guests)
  UserController.updateProfileById(id, profile, function (err, res) {
    if (err) {
      return callback(err, res);
    }
    console.log("UserController.updateProfileAndGuests: profile updated")
    var existing_guests = []
    var new_guests = []
    for (var i = 0; i < guests.length; i++) {
      if (guests[i]._id !== undefined) {
        var guest = {};
        var profile = {};
        profile.firstName = guests[i].firstName;
        profile.lastName = guests[i].lastName;
        guest.profile = profile;
        guest._id = guests[i]._id;
        existing_guests.push(guest);
        console.log("added to existing")
      }
      else {
        new_guests.push(guests[i]);
        console.log("added to new")
      }
    }
    console.log("UserController.updateProfileAndGuests: existing = ")
    console.log(existing_guests)
    console.log("UserController.updateProfileAndGuests: new = ")
    console.log(new_guests)
    updatePlusOne(id, existing_guests, 0, [], function (user, guest_ids, error) {
      console.log("done updating plus ones")
      if (error) {
        console.log(error)
        return callback(error, res);
      }
      createPlusOne(user, new_guests, 0, [], function (user2, guest_ids2, error2) {
        console.log("done creating plus ones")
        if (error2) {
          console.log(error2)
          return callback(error2, res)
        }
        var all_guests = []
        all_guests = all_guests.concat(guest_ids);
        all_guests = all_guests.concat(guest_ids2);
        console.log("UserController.updateProfileAndGuests: all guests")
        console.log(all_guests)
        UserController.updateGuestsById(user2, all_guests, callback);
      })
    })
  });
}

UserController.updateGuestsById = function (id, guests, callback) {
  // Check if its within the registration window.
  Settings.getRegistrationTimes(function (err, times) {
    if (err) {
      callback(err);
    }

    var now = Date.now();

    if (now < times.timeOpen) {
      return callback({
        message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
      });
    }

    if (now > times.timeClose) {
      return callback({
        message: "Sorry, registration is closed."
      });
    }

    User.findOneAndUpdate({
      _id: id
    },
      {
        $set: {
          'lastUpdated': Date.now(),
          'guests': guests
        }
      },
      {
        new: true
      },
      callback);
  });
}

/**
 * Update a user's profile object, given an id and a profile.
 *
 * @param  {String}   id       Id of the user
 * @param  {Object}   profile  Profile object
 * @param  {Function} callback Callback with args (err, user)
 */
UserController.updateProfileById = function (id, profile, callback) {
  // Validate the user profile, and mark the user as profile completed
  // when successful.
  User.validateProfile(profile, function (err) {

    if (err) {
      return callback({ message: 'invalid profile' });
    }

    // Check if its within the registration window.
    Settings.getRegistrationTimes(function (err, times) {
      if (err) {
        callback(err);
      }

      var now = Date.now();

      if (now < times.timeOpen) {
        return callback({
          message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
        });
      }

      if (now > times.timeClose) {
        return callback({
          message: "Sorry, registration is closed."
        });
      }
    });

    User.findOneAndUpdate({
      _id: id
    },
      {
        $set: {
          'lastUpdated': Date.now(),
          'profile': profile
        }
      },
      {
        new: true
      },
      callback);

  });
};

/**
 * Update a user's profile object, given an id and a profile.
 *
 * @param  {String}   id       Id of the user
 * @param  {Object}   profile  Profile object
 * @param  {Function} callback Callback with args (err, user)
 */
UserController.updateDining = function (id, diningOption, callback){
  // Check if its within the registration window.
  Settings.getRegistrationTimes(function(err, times){
    if (err) {
      callback(err);
    }

    var now = Date.now();

    if (now < times.timeOpen){
      return callback({
        message: "Registration opens in " + moment(times.timeOpen).fromNow() + "!"
      });
    }

    if (now > times.timeClose){
      return callback({
        message: "Sorry, registration is closed."
      });
    }
  });

  User.findOneAndUpdate({
    _id: id
  },
    {
      $set: {
        'lastUpdated': Date.now(),
        'diningOption': diningOption,
        'status.completedProfile': true
      }
    },
    {
      new: true
    },
    callback);
};

/**
 * Update a user's confirmation object, given an id and a confirmation.
 *
 * @param  {String}   id            Id of the user
 * @param  {Object}   confirmation  Confirmation object
 * @param  {Function} callback      Callback with args (err, user)
 */
UserController.updateConfirmationById = function (id, confirmation, callback) {

  User.findById(id).exec(function (err, user) {

    if (err || !user) {
      return callback(err);
    }

    // Make sure that the user followed the deadline, but if they're already confirmed
    // that's okay.
    if (Date.now() >= user.status.confirmBy && !user.status.confirmed) {
      return callback({
        message: "You've missed the confirmation deadline."
      });
    }

    // You can only confirm acceptance if you're admitted and haven't declined.
    User.findOneAndUpdate({
      '_id': id,
      'verified': true,
      'status.admitted': true,
      'status.declined': { $ne: true }
    },
      {
        $set: {
          'lastUpdated': Date.now(),
          'confirmation': confirmation,
          'status.confirmed': true,
        }
      }, {
      new: true
    },
      callback);

  });
};

/**
 * Decline an acceptance, given an id.
 *
 * @param  {String}   id            Id of the user
 * @param  {Function} callback      Callback with args (err, user)
 */
UserController.declineById = function (id, callback) {
  User.findOneAndUpdate({
    '_id': id,
    'status.declined': false
  },
    {
      $set: {
        'status.declined': true
      }
    }, {
    new: true
  },
    callback);
};

UserController.updateTable = function(id, tableid, callback) {
  User.findOneAndUpdate({
    '_id': id
  },
    {
      $set: {
        'tableid': tableid
      }
    }, {
    new: true
  },
    callback);  
}

/**
 * Verify a user's email based on an email verification token.
 * @param  {[type]}   token    token
 * @param  {Function} callback args(err, user)
 */
UserController.verifyByToken = function (token, callback) {
  User.verifyEmailVerificationToken(token, function (err, email) {
    if (!email) {
      callback("Invalid token", null);
      return;
    }
    User.findOneAndUpdate({
      email: email.toLowerCase()
    }, {
      $set: {
        'verified': true
      }
    }, {
      new: true
    },
      callback);
  });
};

/**
 * Get a specific user's teammates. NAMES ONLY.
 * @param  {String}   id       id of the user we're looking for.
 * @param  {Function} callback args(err, users)
 */
UserController.getTeammates = function (id, callback) {
  User.findById(id).exec(function (err, user) {
    if (err || !user) {
      return callback(err, user);
    }

    var code = user.teamCode;

    if (!code) {
      return callback({
        message: "You're not on a team."
      });
    }

    User
      .find({
        teamCode: code
      })
      .select('profile.name')
      .exec(callback);
  });
};

function fetchGuests(guests, index, results, callback) {
  if (index >= guests.length) {
    return callback(undefined, results)
  }

  User.findById(guests[index]).exec(function (err, user) {
    if (err || !user) {
      callback(err, results)
    }
    console.log(user)
    var guest_info = {};
    // guest_info.firstName = user.profile.firstName;
    // guest_info.lastName = user.profile.lastName;
    // guest_info._id = user._id;
    results.push(user)
    fetchGuests(guests, index + 1, results, callback);
  })
}

/**
 * Get a specific user's guests. NAMES ONLY.
 * @param  {String}   id       id of the user we're looking for.
 * @param  {Function} callback args(err, users)
 */
UserController.getGuests = function (id, callback) {
  User.findById(id).exec(function (err, user) {
    if (err || !user) {
      return callback(err, user);
    }

    var guests = user.guests;
    console.log(guests)
    fetchGuests(guests, 0, [], function (err2, results) {
      if (err2) {
        console.log(err2);
      }
      callback(err2, results);
    });
  });
};

/**
 * Given a team code and id, join a team.
 * @param  {String}   id       Id of the user joining/creating
 * @param  {String}   code     Code of the proposed team
 * @param  {Function} callback args(err, users)
 */
UserController.createOrJoinTeam = function (id, code, callback) {

  if (!code) {
    return callback({
      message: "Please enter a team name."
    });
  }

  if (typeof code !== 'string') {
    return callback({
      message: "Get outta here, punk!"
    });
  }

  User.find({
    teamCode: code
  })
    .select('profile.name')
    .exec(function (err, users) {
      // Check to see if this team is joinable (< team max size)
      if (users.length >= maxTeamSize) {
        return callback({
          message: "Team is full."
        });
      }

      // Otherwise, we can add that person to the team.
      User.findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          teamCode: code
        }
      }, {
        new: true
      },
        callback);

    });
};

/**
 * Given an id, remove them from any teams.
 * @param  {[type]}   id       Id of the user leaving
 * @param  {Function} callback args(err, user)
 */
UserController.leaveTeam = function (id, callback) {
  User.findOneAndUpdate({
    _id: id
  }, {
    $set: {
      teamCode: null
    }
  }, {
    new: true
  },
    callback);
};

/**
 * Resend an email verification email given a user id.
 */
UserController.sendVerificationEmailById = function (id, callback) {
  User.findOne(
    {
      _id: id,
      verified: false
    },
    function (err, user) {
      if (err || !user) {
        return callback(err);
      }
      var token = user.generateEmailVerificationToken();
      Mailer.sendPostAcceptance(user);
      return callback(err, user);
    });
};

/**
 * Password reset email
 * @param  {[type]}   email    [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
UserController.sendPasswordResetEmail = function (email, callback) {
  User
    .findOneByEmail(email)
    .exec(function (err, user) {
      if (err || !user) {
        return callback(err);
      }

      var token = user.generateTempAuthToken();
      Mailer.sendPasswordResetEmail(user, token, callback);
    });
};

function loadGuests(user, doLoad, callback) {
  if (doLoad && user.guests.length > 0) {
    UserController.getGuests(user._id, function(err, res){
      if (err) {
        return callback(err, res)
      }
      user.loadedGuests = res;
      callback(err, user);
    })
    return;
  }
  user.loadedGuests = [];
  return callback(undefined, user);
}

function loadGuestsAndSendEmail(user, template, options, callback) {
  loadGuests(user, template.loadGuests, function(err, res){
    if (err) {
      return callback(err, res);
    }
    Mailer.sendTemplateEmail(res, template, options, {}, callback);
  })
}

function generateEmailWithOption(uid, options, templateId, callback) {
  User
  .findById(uid)
  .exec(function (err, user) {
    if (err | !user) {
      console.log(err);
      return callback(err)
    }
    EmailTemplate.findById(templateId).exec(function(terr, template){
      if (terr || !template) {
        console.log(terr)
        return callback(terr);
      }
      if (!options.preview)
      {
        options.subject = template.subject;
        options.to = user.email
      }
      return loadGuestsAndSendEmail(user, template, options, callback);
    })
  })
}

UserController.previewEmail = function (uid, templateId, callback) {
  var options = {
    preview: true
  };
  generateEmailWithOption(uid, options, templateId, callback);
};

UserController.sendTemplateEmail = function (uid, templateId, callback) {
  var options = {
  };
  generateEmailWithOption(uid, options, templateId, callback);
};

/**
 * Event Update email
 * @param  {[type]}   email    [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
UserController.sendUpdateEmail = function (email, callback) {
  User
    .findOneByEmail(email)
    .exec(function (err, user) {
      if (err || !user) {
        return callback(err);
      }

      Mailer.sendUpdateEmail(user, callback);
    });
};

/**
 * UNUSED
 *
 * Change a user's password, given their old password.
 * @param  {[type]}   id          User id
 * @param  {[type]}   oldPassword old password
 * @param  {[type]}   newPassword new password
 * @param  {Function} callback    args(err, user)
 */
UserController.changePassword = function (id, oldPassword, newPassword, callback) {
  if (!id || !oldPassword || !newPassword) {
    return callback({
      message: 'Bad arguments.'
    });
  }

  User
    .findById(id)
    .select('password')
    .exec(function (err, user) {
      if (user.checkPassword(oldPassword)) {
        User.findOneAndUpdate({
          _id: id
        }, {
          $set: {
            password: User.generateHash(newPassword)
          }
        }, {
          new: true
        },
          callback);
      } else {
        return callback({
          message: 'Incorrect password'
        });
      }
    });
};

/**
 * Reset a user's password to a given password, given a authentication token.
 * @param  {String}   token       Authentication token
 * @param  {String}   password    New Password
 * @param  {Function} callback    args(err, user)
 */
UserController.resetPassword = function (token, password, callback) {
  if (!password || !token) {
    return callback({
      message: 'Bad arguments'
    });
  }

  if (password.length < 6) {
    return callback({
      message: 'Password must be 6 or more characters.'
    });
  }


  User.verifyTempAuthToken(token, function (err, id) {

    if (err || !id) {
      return callback(err);
    }

    User
      .findOneAndUpdate({
        _id: id
      }, {
        $set: {
          password: User.generateHash(password)
        }
      }, function (err, user) {
        if (err || !user) {
          return callback(err);
        }

        Mailer.sendPasswordChangedEmail(user);
        return callback(null, {
          message: 'Password successfully reset!'
        });
      });
  });
};

/**
 * [ADMIN ONLY]
 *
 * Admit a user.
 * @param  {String}   userId   User id of the admit
 * @param  {String}   user     User doing the admitting
 * @param  {Function} callback args(err, user)
 */
UserController.admitUser = function (id, user, callback) {
  Settings.getRegistrationTimes(function (err, times) {
    User
      .findOneAndUpdate({
        _id: id,
        verified: true
      }, {
        $set: {
          'status.admitted': true,
          'status.admittedBy': user.email,
          'status.confirmBy': times.timeConfirm
        }
      }, {
        new: true
      },
        callback);
  });
};

UserController.verifyById = function(id, user, callback){
  User.findOneAndUpdate({
    _id: id
  },{
    $set: {
      'verified': true
    }
  }, {
    new: true
  },
  callback);
};

UserController.unverifyById = function(id, user, callback){
  User.findOneAndUpdate({
    _id: id
  },{
    $set: {
      'verified': false
    }
  }, {
    new: true
  },
  callback);
};

/**
 * [ADMIN ONLY]
 *
 * Check in a user.
 * @param  {String}   userId   User id of the user getting checked in.
 * @param  {String}   user     User checking in this person.
 * @param  {Function} callback args(err, user)
 */
UserController.checkInById = function (id, user, callback) {
  User.findOneAndUpdate({
    _id: id,
    verified: true
  }, {
    $set: {
      'status.checkedIn': true,
      'status.checkInTime': Date.now()
    }
  }, {
    new: true
  },
    callback);
};

/**
 * [ADMIN ONLY]
 *
 * Check out a user.
 * @param  {String}   userId   User id of the user getting checked out.
 * @param  {String}   user     User checking in this person.
 * @param  {Function} callback args(err, user)
 */
UserController.checkOutById = function (id, user, callback) {
  User.findOneAndUpdate({
    _id: id,
    verified: true
  }, {
    $set: {
      'status.checkedIn': false
    }
  }, {
    new: true
  },
    callback);
};

UserController.markTestAccount = function (id, user, callback) {
  User.findOneAndUpdate({
    _id: id
  }, {
    $set: {
      'status.testAccount': true
    }
  }, {
    new: true
  },
    callback);
};

UserController.unmarkTestAccount = function (id, user, callback) {
  User.findOneAndUpdate({
    _id: id
  }, {
    $set: {
      'status.testAccount': false,
      'status.checkInTime': Date.now()
    }
  }, {
    new: true
  },
    callback);
};

/**
 * [ADMIN ONLY]
 *
 * Make user an admin
 * @param  {String}   userId   User id of the user being made admin
 * @param  {String}   user     User making this person admin
 * @param  {Function} callback args(err, user)
 */
UserController.makeAdminById = function (id, user, callback) {
  User.findOneAndUpdate({
    _id: id
  }, {
    $set: {
      'admin': true
    }
  }, {
    new: true
  },
    callback);
};

/**
 * [ADMIN ONLY]
 *
 * Make user an admin
 * @param  {String}   userId   User id of the user being made admin
 * @param  {String}   user     User making this person admin
 * @param  {Function} callback args(err, user)
 */
UserController.removeAdminById = function (id, user, callback) {
  User.findOneAndUpdate({
    _id: id
  }, {
    $set: {
      'admin': false
    }
  }, {
    new: true
  },
    callback);
};

/**
 * [ADMIN ONLY]
 */

UserController.getStats = function (callback) {
  return callback(null, Stats.getUserStats());
};

UserController.removeById = function(id, callback) {
  User.remove({_id:id},callback)
}

module.exports = UserController;
