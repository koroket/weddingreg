var _ = require('underscore');
var async = require('async');
var User = require('../models/User');

// In memory stats.
var stats = {};
function calculateStats(){
  console.log('Calculating stats...');
  var newStats = {
    lastUpdated: 0,

    total: 0,

    verified: 0,
    submitted: 0,
    admitted: 0,
    confirmed: 0,
    declined: 0,

    dining: {
      meatR: 0,
      meatW: 0,
      fish: 0,
      vegetarian: 0,
      kid: 0,
      nofood: 0
    }

  };

  User
    .find({})
    .exec(function(err, users){
      if (err || !users){
        throw err;
      }

      newStats.total = users.length;

      async.each(users, function(user, callback){

        // Count verified
        newStats.verified += user.verified ? 1 : 0;

        // Count submitted
        newStats.submitted += user.status.completedProfile ? 1 : 0;

        // Count declined
        newStats.declined += user.status.declined ? 1 : 0;

        newStats.dining.meatR += (user.diningOption.entree === 'M' && 
                                  user.diningOption.entreeOption === 'R') ? 1 : 0;

        newStats.dining.meatW += (user.diningOption.entree === 'M' && 
                                  user.diningOption.entreeOption === 'W') ? 1 : 0;

        newStats.dining.fish += (user.diningOption.entree === 'F') ? 1 : 0;

        newStats.dining.vegetarian += (user.diningOption.entree === 'V') ? 1 : 0;

        newStats.dining.kid += (user.diningOption.entree === 'K') ? 1 : 0;

        newStats.dining.nofood += (user.diningOption.entree === 'U') ? 1 : 0;

        callback(); // let async know we've finished
      }, function() {

        console.log('Stats updated!');
        newStats.lastUpdated = new Date();
        stats = newStats;
      });
    });

}

// Calculate once every five minutes.
calculateStats();
setInterval(calculateStats, 300000);

var Stats = {};

Stats.getUserStats = function(){
  return stats;
};

module.exports = Stats;
