var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var mysql = require('mysql')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
app.io = require('socket.io')()

var routes = require('./routes/index')(app.io);


var config = {host : 'localhost', database : 'trec_rts'};
var connection;
function retryOnDisconnect(){
  connection = mysql.createConnection(config);
  connection.connect(function(err){
    if(err){
      console.log('DB disconnect: ', err);
      setTimeout(retryOnDisconnect, 2000);
    }
  });
  connection.on('error', function(err){
    console.log('DB Error: ', err);
    if(err.code === "PROTOCOL_CONNECTION_LOST"){
      retryOnDisconnect();
    }
  });
}
retryOnDisconnect();

app.use(function(req,res,next){
  req.db = connection;
  next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


module.exports = app;
