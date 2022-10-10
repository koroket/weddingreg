var path = require('path');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var templatesDir = path.join(__dirname, '../templates');
var Email = require('email-templates');
var User = require('../models/User');
var EmailTemplate = require('../models/EmailTemplate');
const { url } = require('inspector');

var ROOT_URL = process.env.ROOT_URL;

var HACKATHON_NAME = process.env.HACKATHON_NAME;
var EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;
var TWITTER_HANDLE = process.env.TWITTER_HANDLE;
var FACEBOOK_HANDLE = process.env.FACEBOOK_HANDLE;

var EMAIL_HOST = process.env.EMAIL_HOST;
var EMAIL_USER = process.env.EMAIL_USER;
var EMAIL_PASS = process.env.EMAIL_PASS;
var EMAIL_PORT = process.env.EMAIL_PORT;
var EMAIL_CONTACT = process.env.EMAIL_CONTACT;
var EMAIL_HEADER_IMAGE = process.env.EMAIL_HEADER_IMAGE;
var EMAIL_HEADER_IMAGE_FOOD = process.env.EMAIL_HEADER_IMAGE_FOOD;
if (EMAIL_HEADER_IMAGE.indexOf("https") == -1) {
  EMAIL_HEADER_IMAGE = ROOT_URL + EMAIL_HEADER_IMAGE;
}

var NODE_ENV = process.env.NODE_ENV;

var options = {
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
};

var transporter = nodemailer.createTransport(smtpTransport(options));

var controller = {};

controller.transporter = transporter;

function logEmailHistory(user, template, callback) {
  if (!user.emailHistory)
  {
    user.emailHistory = {}
  }

  user.emailHistory[template._id] = true;

  User
    .findOneAndUpdate({
      _id: user._id
    }, {
      $set: {
        emailHistory: user.emailHistory
      }
    }, {
      new: true
    },
    callback);
}

function sendOneByTemplateName(tname, user, locals, callback) {
  EmailTemplate
    .findOneByName(tname)
    .exec(function (err, template) {
      if (err || !template) {
        console.log(err)
        return callback(err);
      }
      var options = {
        to: user.email,
        subject: template.subject
      };
      return controller.sendTemplateEmail(user, template, options, locals, callback);
    });
}

function postRenderSend(email, options, data, child, childText, callback) {
  data.child = child;
  data.childText = childText;
  if (options.preview)
  {
    email
    .render(path.join(__dirname, "../", "emails", "email-basic", "html.pug"), data)
    .then(function(res){
      if (callback) {
        return callback(undefined, res);
      }
      return;
    })
    .catch(function(err) {
      console.log(err)
      if (callback) {
        return callback(err, undefined);
      }
      return;
    });
    return;
  }

  email.send({
    locals: data,
    message: {
      subject: options.subject,
      to: options.to,
      from: "Bando Family <admin@bandoevents.com>",
      list: {
        unsubscribe: {
          url: "https://bandoevents.com/unsubscribe"
        }
      }
    },
    template: path.join(__dirname, "..", "emails", "email-basic"),
  }).then(res => {
    logEmailHistory(data.user, data.template, function(err, emailHistoryRes){
      if (err) {
        if (callback) {
          return callback(err, res);
        }
        return;
      }
      var combined = {};
      combined.emailHistoryData = emailHistoryRes;
      combined.sendData = res
      if (callback) {
        return callback(err, combined);
      }
    });
    return;
  }).catch(err => {
    console.log(err)
    if (callback) {
      return callback(err, undefined);
    }
    return;
  });
}

function renderChildTextThenSend(templateName, email, options, data, child, callback) {
  email
  .render(path.join(__dirname, "../", "emailsDynamic", templateName + "_ALT_text"), data)
  .then(function(res){
    console.log(res)
    postRenderSend(email, options, data, child, res, callback);
  })
  .catch(function(err) {
    console.log(err)
    if (callback) {
      callback(err, undefined);
    }
  });
}

function renderChildHtmlThenSend(templateName, options, data, callback) {
  const email = new Email({
    message: {
      from: EMAIL_ADDRESS
    },
    send: true,
    transport: transporter
  });

  data.emailHeaderImage = EMAIL_HEADER_IMAGE;
  data.emailAddress = EMAIL_ADDRESS;
  data.hackathonName = HACKATHON_NAME;
  data.twitterHandle = TWITTER_HANDLE;
  data.facebookHandle = FACEBOOK_HANDLE;
  data.unsubscribeUrl = ROOT_URL + '/unsubscribe'

  email
  .render(path.join(__dirname, "../", "emailsDynamic", templateName), data)
  .then(function(res){
    console.log(res)
    renderChildTextThenSend(templateName, email, options, data, res, callback);
  })
  .catch(function(err) {
    console.log(err)
    if (callback) {
      callback(err, undefined);
    }
  });
}

controller.sendPostAcceptance = function (user, callback) {
  sendOneByTemplateName('PostRegister', user, {}, function (err, res) {
    if (err) { 
      console.log(err);
    }
    // it's fine if this email doesn't go through just keep it successful
    // otherwise user might be confused email already taken.
    callback(undefined, user)
  });
};

/**
 * Send a password recovery email.
 * @param  {[type]}   email    [description]
 * @param  {[type]}   token    [description]
 * @param  {Function} callback [description]
 */
controller.sendPasswordResetEmail = function (user, token, callback) {
  var locals = {
    actionUrl: ROOT_URL + '/reset/' + token,
  };
  sendOneByTemplateName('PasswordReset', user, locals, callback);
};

/**
 * Send a password recovery email.
 * @param  {[type]}   email    [description]
 * @param  {Function} callback [description]
 */
controller.sendPasswordChangedEmail = function (user, callback) {
  sendOneByTemplateName('PasswordChanged', user, {}, callback);
};

controller.sendUpdateEmail = function (user, callback) {
  sendOneByTemplateName('PostAcceptance', user, {}, callback);
};

controller.sendTemplateEmail = function (user, template, options, locals, callback) {
  var imageUrl = "https://www.dropbox.com/s/qevjvq61jvxcka9/JenandMike.jpeg?raw=1"

  if (template.imageURL) {
    imageUrl = template.imageURL
  }

  locals.loginUrl = ROOT_URL;
  locals.imageUrl = imageUrl;
  locals.user = user;
  locals.template = template;

  /**
   * Email-update takes a few template values:
   * {
   *   verifyUrl: the url that the user must visit to verify their account
   * }
   */
  renderChildHtmlThenSend(template.name, options, locals, function (err, info) {
    if (err) {
      console.log(err);
    }
    if (info) {
      console.log(info.message);
    }
    if (callback) {
      callback(err, info);
    }
  });

};

module.exports = controller;
