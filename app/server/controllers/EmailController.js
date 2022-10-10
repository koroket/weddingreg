var EmailTemplate = require('../models/EmailTemplate');
var path = require('path');
var fs = require('fs');

var EmailController = {};

function updateTemplateById(id, name, subject, imageurl, loadGuests, trackInAdmin, data, callback) {
  if (id)
  {
    EmailTemplate.findOneAndUpdate({
      _id: id
    },
      {
        $set: {
          'subject': subject,
          'name': name,
          'imageURL': imageurl,
          'loadGuests': loadGuests,
          'trackInAdmin': trackInAdmin
        }
      },
      {
        new: true
      },
      callback);
  }
  else
  {
    console.log("new EmailTemplate")
    var temp = new EmailTemplate();
    temp.subject = subject;
    temp.name = name;
    temp.imageURL = imageurl;
    temp.loadGuests = loadGuests;
    temp.trackInAdmin = trackInAdmin;
    temp.save(function(err, data){
      if (err){
        console.log(err)
        // Duplicate key error codes
        if (err.name === 'MongoError' && (err.code === 11000 || err.code === 11001)) {
          return callback({
            message: 'Account created but error occurred for processing plus ones'
          }, undefined);
        }
        return callback(err, undefined);
      } else {
        callback(err, data)
      }
    });

  }
}

/**
 * Update any field in the EmailTemplates.
 * @param  {String}   field    Name of the field
 * @param  {Any}      value    Value to replace it to
 * @param  {Function} callback args(err, settings)
 */
EmailController.updateById = function(id, name, subject, imageurl, loadGuests, trackInAdmin, data, textData, callback){
  updateTemplateById(id, name, subject, imageurl, loadGuests, trackInAdmin, data, function(err, res){
    if (err) { return callback(err, res) }
    var filepath = path.join(__dirname, "../", "emailsDynamic", name + '.pug')
    fs.writeFile(filepath, data, { flag: 'w' }, function (err) {
      if (err) {
        console.log(err);
        return callback({
          message: 'Template updated but failed saving html'
        }, undefined);
      }
      filepath = path.join(__dirname, "../", "emailsDynamic", name + '_ALT_text' +'.pug')
      fs.writeFile(filepath, textData, { flag: 'w' }, function (err2) {
        if (err2) {
          console.log(err2);
          return callback({
            message: 'Template updated but failed saving text'
          }, undefined);
        }
        return callback(err2, res);
      });
    });
  });
};

EmailController.getTemplates = function(callback){
  EmailTemplate.getEmailTemplates(function(err, templates){
    if (err)
    {
      console.log(err);
    }
    else
    {
      // handle empty EmailTemplates case
      if (!templates) {
        templates = [];
        return callback(err, templates)
      }
    }
    callback(err, templates);
  });
};

function getTemplateTextByName(name, callback) {
  var filepath = path.join(__dirname, "../", "emailsDynamic", name + '_ALT_text' + '.pug')
  fs.readFile(filepath, "utf8", function (err,data) {
    if (err) {
      console.log(err);
      return callback(err, undefined);
    }
    console.log(data);
    callback(err, data)
  }); 
}

EmailController.getTemplateByName = function(name, callback) {
  getTemplateTextByName(name, function(err, res) {
    if (err) {
      console.log(err);
      return callback(err, res);
    }
    var filepath = path.join(__dirname, "../", "emailsDynamic", name + '.pug')
    fs.readFile(filepath, "utf8", function (err,data) {
      if (err) {
        console.log(err);
        return callback(err, data);
      }
      var combined = {};
      combined.html = data;
      combined.text = res;
      callback(err, combined);
    });   
  })
};

EmailController.deleteById = function(id, callback){
  EmailTemplate.findOneAndDelete({
    _id: id
  },callback);
};

module.exports = EmailController;