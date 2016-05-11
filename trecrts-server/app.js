var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var mysql = require('mysql')
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var winston = require('winston')
winston.emitErrs = true;
require('winston-mysql-transport').Mysql;

var logger = new winston.Logger({
  transports : [
    new winston.transports.Console({
      level : 'debug',
      handleExceptions : true,
      json: false,
      colorize: true
    }),
    new winston.transports.Mysql({
      database:'trec_rts',
      host:'localhost',
      connectionLimit:15,
      table:'log_table',
      user: ' '}) 
  ],
  exitOnError: false
})
logger.stream = {
  write: function(message,encoding){
    logger.info(message) 
  }
}
var app = express();
app.io = require('socket.io')()

var routes = require('./routes/index')(app.io);

var config = {host : 'localhost', database : 'trec_rts',connectionLimit:20};
var connection = mysql.createPool(config);

app.use(function(req,res,next){
  req.setTimeout(0)
  res.setTimeout(0)
  req.db = connection;
  next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan('combined',{'stream':logger.stream}))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


module.exports = app;
