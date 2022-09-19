// Load the dotfiles.
require('dotenv').load({silent: true});

var express         = require('express');

// Middleware!
var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');
var morgan          = require('morgan');

var mongoose        = require('mongoose');
var port            = process.env.PORT || 3000;
var database        = process.env.DATABASE || process.env.MONGODB_URI || "mongodb://localhost:27017";

var settingsConfig  = require('./config/settings');
var adminConfig     = require('./config/admin');

var fs              = require('fs');
var https           = require('https');
var cron            = require('node-cron');
var request         = require('request');

var headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
};

var dataString = 'grant_type=refresh_token&refresh_token=' + process.env.DROPBOX_REFRESH;

var options = {
    url: 'https://api.dropbox.com/oauth2/token',
    method: 'POST',
    headers: headers,
    body: dataString,
    auth: {
        'user': process.env.DROPBOX_USER,
        'pass': process.env.DROPBOX_PASS
    }
};

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body)
      console.log(body["access_token"])
      if (body && body["access_token"]) {
        global.dropbox_access_token = body["access_token"]
        return
      }
    }
    console.log("dropbox token refresh error")
    console.log(error)
    console.log(response)
    setTimeout(refreshDropboxAccessToken, 300000);
}

function refreshDropboxAccessToken(){
  console.log("refreshing dropbox accesstoken...")
  request(options, callback);
}

if (process.env.NODE_ENV != 'dev')
{
  global.dropbox_access_token = ""
  console.log("Generating new access token")
  refreshDropboxAccessToken();
  console.log("Will start cron job for every 3 hours")
  cron.schedule('* */3 * * *', () => {
    refreshDropboxAccessToken();
  });
}
else
{
  console.log("Using access token from env")
  global.dropbox_access_token = process.env.DROPBOX_TOKEN
}

var app             = express();

var hostname  = 'bandoevents.com'
var httpsPort = 443;

var httpsOptions = {}

if (process.env.NODE_ENV != 'dev')
{
  httpsOptions = {
    cert: fs.readFileSync('../ssl/bandoevents.com.crt'),
    ca:   fs.readFileSync('../ssl/bandoevents.com.ca-bundle'),
    key:  fs.readFileSync('../ssl/bandoevents.com.key')
  }
}

// Connect to mongodb
mongoose.connect(database);

app.use(morgan('dev'));

app.use(bodyParser.json({
  limit: '10mb'
}));
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '10mb'
}));

app.use(methodOverride());

app.use(express.static(__dirname + '/app/client'));

// Routers =====================================================================

var apiRouter = express.Router();
require('./app/server/routes/api')(apiRouter);
app.use('/api', apiRouter);

var authRouter = express.Router();
require('./app/server/routes/auth')(authRouter);
app.use('/auth', authRouter);

require('./app/server/routes')(app);

if (process.env.NODE_ENV != 'dev')
{
  var httpsServer = https.createServer(httpsOptions, app);

  // set up plain http server
  var http = express();

  // set up a route to redirect http to https
  http.get('*', function(req, res) {  
      res.redirect('https://' + req.headers.host + req.url);
  })

  // have it listen on 8080
  http.listen(80);

  // listen (start app with node server.js) ======================================
  module.exports = httpsServer.listen(httpsPort);
  console.log("App listening on port " + httpsPort);
}
else
{
  // listen (start app with node server.js) ======================================
  module.exports = app.listen(port);
  console.log("App listening on port " + port);
}
