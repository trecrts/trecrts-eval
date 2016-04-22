module.exports = function(io){
  var express = require('express')
  var router = express.Router();
  var gcm = require('node-gcm')
  var push_auths = require('./push_auths.js')
  
  var sender = new gcm.Sender(push_auths.gcm);
  var registrationIds = [];
  var regIdx = 0;
  var tweet_queue = [];
  var RATE_LIMIT = 10;
  function genID(){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var ID = '';
    for(var i=0; i < 12; i++)
      ID += chars.charAt(Math.floor(Math.random()*chars.length));
    return ID;
  }
  function send_tweet_socket(tweet,socket){
    socket.emit('tweet',tweet);
  }
  function send_tweet_gcm(tweet,id){
    var message = new gcm.Message();
    message.addData('message',"You have pending tweets to judge.");
    message.addData('title','TREC RTS CrowdJudge' );
    message.addData('tweetid',String(tweet.tweetid))
    message.addData('topid',String(tweet.topid))
    message.addData('topic',String(tweet.topic))
    message.addData('msgcnt','1'); // Shows up in the notification in the status bar
    message.timeToLive = 3000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
    message.addNotification({title: 'TREC RTS CrowdJudge', body : 'You have pending tweets to judge.', icon: 'ic_launcher'});
    sender.send(message, id, 4, function (result) {
      console.log(result);
    });
  }
  //TODO: Add Apple Push

  function send_tweet(tweet){
    var currDevice = registrationIds[regIdx++];
    console.log("Here")
    if(currDevice['type'] === 'gcm')
      send_tweet_gcm(tweet,currDevice['conn']);
    else if(currDevice['type'] === 'socket'){
      console.log("Here")
      send_tweet_socket(tweet,currDevice['conn']);
    }

    if (regIdx >= registrationIds.length) regIdx = 0; 
  }
  
  function validate(db,table,col, id,cb){
    db.query('select * from '+table+' where '+col+' = ?;',[id],cb);
  }
  
  function validate_group(db,groupid,cb){
    validate(db,'groups','groupid',groupid,cb);
  }
  
  function validate_client(db,clientid,cb){
    validate(db,'clients','clientid',clientid,cb);
  }

  function isValidTweet(str){
    return str.match('[0-9]=') !== null
  }
  
  router.post('/register/mobile/',function(req,res){
    var regid = req.body.regid;
    // At least one reg id required
    if ( registrationIds.indexOf(regid) === -1){
      registrationIds.push({'type':'gcm','conn':regid});
    }
    res.status(204).send();
    // Definitely need to do something better here
    if(tweet_queue.length > 0){
      for(var i = 0; i < tweet_queue.length; i++){
        send_tweet(tweet_queue[i]);
      }
      tweet_queue = [];
    }
  });
  
  router.post('/tweets/:topid/:clientid',function(req,res){
    var topid = req.params.topid;
    var clientid  = req.params.clientid;
    var tweets = req.body.tweets;
    validate_client(db,clientid,function(errors,results){
      if (errors || results.length === 0){
        res.status(500).json({'message': 'Unable to validate client: ' + clientid})
        return;
      }
      stmt = ""
      for (var i = 0; i < tweets.length; i++){
        if (! isValidTweetID(tweets[i])){
          res.status(404).json({'message': 'Invalid tweetid: ' + tweets[i]);
        }
        if (i !== 0){
          stmt += ',(\'' + tweets[i] + '\',\'' + topid + '\')';
        } else {
          stmt += '(\'' + tweets[i] + '\',\'' + topid + '\')';
        }  
      }
      db.query('insert into requests_digest_' + clientid + ' (docid,topid) values ' + [stmt],function(errors0,results0){
        if (errors)
          res.status(500).json({'message': 'Unable to insert tweets for end of day digest'});
        res.status(204).send()
      })
    });
  });
  // TODO: Need to enforce topid is valid
  router.post('/tweet/:topid/:tweetid/:clientid',function(req,res){
    var topid = req.params.topid;
    var tweetid = req.params.tweetid;
    var clientid = req.params.clientid;
    var db = req.db;
    validate_client(db,clientid,function(errors,results){
      if(errors || results.length === 0){
        res.status(500).json({'message':'Could not validate client: ' + clientid})
        return;
      }
      db.query('select count(*) from requests_'+clientid+' where topid = ? and submitted between CURDATE() and date_add(CURDATE(),INTERVAL 1 day);', [topid], function(errors0,results0){
        if(errors0 || results0.length === 0){
          res.status(500).json({'message':'Could not process request for topid: ' + topid + ' and ' + tweetid});
          return;
        }else if(results[0] >= RATE_LIMIT){
          res.status(429).json({'message':'Rate limit exceeded for topid: ' + topid});
          return;
        }
        db.query('insert requests_' + clientid + ' (topid,tweetid) values (?,?);',[topid,tweetid], function(errors1,results1){
          if(errors1 || results1.length === 0){
            res.status(500).json({'message':'Could not process request for topid: ' + topid + ' and ' + tweetid});
            return;
           }
          db.query('select query from topics where topid = ?;',topid,function(errors2,results2){
            if(registrationIds.length > 0){
              send_tweet({"tweetid":tweetid,"topid":topid,"topic":results2[0].query});
            }else{
               tweet_queue.push({"tweetid":tweetid,"topid":topid,"topic":results2[0].query});
            }
          })
            
          res.status(204).send();
        });          
      });
    });
  });
  
  router.post('/judge/:topid/:tweetid/:rel', function(req,res){
    var topid = req.params.topid;
    var tweetid = req.params.tweetid;
    var rel = req.params.rel;
    //var partid = req.body.partid;
    var partid = "foo";
    var db = req.db;
    db.query('insert judgements_'+topid+'(assessor,tweetid,rel) values (?,?,?);',[partid,tweetid,rel],function(errors,results){
      if(errors){
        console.log(errors)
        console.log("Unable to log: ",topid," ",tweetid," ",rel);
        res.status(500).json({message : 'Unable to relevance assessment'})
      }else{
        console.log("Logged: ",topid," ",tweetid," ",rel);
        res.status(204).send()
      }
    });
  });
 
  router.get('/judge/:topid/:tweetid/:clientid', function(req,res){
    var clientid = req.params.clientid;
    var topid = req.params.topid;
    var tweetid = req.params.tweetid;
    var db = req.db;
    validate_client(db,clientid,function(errors,results){
      if(errors || results.length === 0){
        res.status(500).json({'message':'Could not validate client: ' + clientid})
        return;
      }
      db.query('select rel from judgements_'+topid+' where tweetid = ?;'[tweetid],function(errors1,results1){
        if(errors1){
          res.status(500).json({'message':'Error retrieving judgement for : '+ tweetid + ' on ' + topid});
        }else if (results1.length ===0){
          res.status(500).json({'message':'No judgement for : '+ tweetid + ' on ' + topid});
        }
        res.json({'tweetid':tweetid,'topid':topid,'rel':results[0].rel});
      });
    });
  });
  
  router.post('/register/system/', function(req,res){
    var groupid = req.body.groupid;
    var db = req.db;
    var clientid = genID();
    validate_group(db,groupid,function(errors,results){
      if(errors || results.length === 0){
        res.status(500).json({'message':'Unable to register a client for group: ' + groupid});
        return;
      }
      db.query('insert clients (groupid,clientid,ip) values (?,?,?);',[groupid,clientid,req.ip], function(errors1,results1){
        if(errors1){
          res.status(500).json({'message':'Unable to register system.'});
          return;
        }
        db.query('create table requests_'+clientid+' like requests_template;'); // Assume this works for now
        res.json({'clientid':clientid});
      });
    });
  });
  
  router.get('/topics/:clientid', function(req,res){
    var clientid = req.params.clientid;
    var db = req.db;
    validate_client(db,clientid,function(errors,results){
      if(errors || results.length === 0){
        console.log(errors);
        res.status(500).json({'message':'Unable to validate client: ' + clientid});
        return;
      }
      db.query('select topid,query from topics;',function(errors1,results1){
        if(errors1){
          res.status(500).json({'message':'Unable to retrieve topics for client: ' + clientid});
        }else{
          res.json(results1);
        }
      });
    });
  });
  io.on('connection', function(socket){
    socket.on('register',function(){
      console.log("Registered")
      registrationIds.push({'type':'socket','conn':socket});
    });
    socket.on('judge',function(msg){
      console.log('Judged: ', msg.topid, msg.tweetid,msg.rel);
    });
    socket.once('disconnect',function(){
      console.log("Disconnect");
      var idx = registrationIds.indexOf(socket);
      if (idx > -1) registrationIds.splice(idx,1);
    });
  });
  return router;
}
