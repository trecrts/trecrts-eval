var express = require('express');
var router = express.Router();
var gcm = require('node-gcm')

var sender = new gcm.Sender("AIzaSyDnR9xDxxmjknpYnter9_H0S1oJcu022zw");
var registrationIds = [];
var regIdx = 0;
var tweet_queue = [];

function genID(){
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var ID = '';
  for(var i=0; i < 12; i++)
    ID += chars.charAt(Math.floor(Math.random()*chars.length));
  return ID;
}

function send_tweet(tweet){
  var message = new gcm.Message();
  message.addData('message',"You have pending tweets to judge.");
  message.addData('title','TREC RTS CrowdJudge' );
  message.addData('tweetid',String(tweet.tweetid))
  message.addData('topid',String(tweet.topid))
  message.addData('topic',String(tweet.topic))
  message.addData('msgcnt','1'); // Shows up in the notification in the status bar
  message.timeToLive = 3000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
  message.addNotification({title: 'TREC RTS CrowdJudge', body : 'You have pending tweets to judge.', icon: 'ic_launcher'});
  sender.send(message, registrationIds[regIdx++], 4, function (result) {
    console.log(result);
  });
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

router.post('/register/mobile/',function(req,res){
  var regid = req.body.regid;
  // At least one reg id required
  if ( registrationIds.indexOf(regid) === -1){
    registrationIds.push(regid);
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


// TODO: Need to enforce rate-limit and enforce topid is valid
router.post('/tweet/:topid/:tweetid',function(req,res){
  var topid = req.params.topid;
  var tweetid = req.params.tweetid;
  var clientid = req.body.clientid;
  var db = req.db;
  validate_client(db,clientid,function(errors,results){
    if(errors || results.length === 0){
      res.status(500).json({'message':'Could not validate client: ' + clientid})
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
          console.log("Hold tweet")
          //tweet_queue.push({"tweetid":tweetid,"topid":topid,"topic":results2[0].query});
        }
        // Don't send the tweet yet, since mobile code is no longer compatible  
      })
      
      res.status(204).send();
    });
  });
});

router.post('/judge/:topid/:tweetid/:rel', function(req,res){
  var topid = req.params.topid;
  var tweetid = req.params.tweetid;
  var rel = req.params.rel;
  //var partid = req.body.partid;
  res.status(204).send();
  console.log(topid,tweetid,rel)
  /*db.query('insert judgements_'+topid+'(partid,tweetid,rel) values (?,?);',[partid,tweetid,rel],function(errors,results){
    if(errors){
      console.log("Unable to log: ",topid," ",tweetid," ",rel);
    }else{
      console.log("Logged: ",topid," ",tweetid," ",rel);
    }
  });*/
});

router.get('/judge/:topid/:tweetid', function(req,res){
  var clientid = req.body.clientid;
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
      }else{
        res.json({'tweetid':tweetid,'topid':topid,'rel':results[0].rel});
      }
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

router.get('/topics/', function(req,res){
  var clientid = req.body.clientid;
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

module.exports = router;
