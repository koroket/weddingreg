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

var app             = express();

var hostname  = 'bandoevents.com'
var httpsPort = 443;

if (process.env.NODE_ENV != 'dev')
{
  const httpsOptions = {
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
