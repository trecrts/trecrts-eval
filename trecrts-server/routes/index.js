module.exports = function(io){
  var express = require('express')
  var router = express.Router();
  var gcm = require('node-gcm')
  var apn = require('apn')
  var push_auths = require('./push_auths.js')
  var apnConnection = new apn.Connection()

  var sender = new gcm.Sender(push_auths.gcm);
  var registrationIds = [];
  var regIdx = 0;
  var tweet_queue = [];
  const RATE_LIMIT = 1000;
  const MAX_ASS = 3;
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
  function find_user(partid){
    for (var idx = 0; idx < registrationIds.length; idx++){
      if(registrationIds[idx].partid === partid)
        return idx;
    }
    return -1;
  }
  function send_tweet_gcm(tweet,id){
    var message = new gcm.Message();
    message.addData('title', 'TREC RTS Mobile Judger');
    message.addData('message','There are pending tweets to judge.')
    message.addData('tweetid',String(tweet.tweetid))
    message.addData('topid',String(tweet.topid))
    message.addData('topic',String(tweet.topic))
    message.addData('content-available', '1');
    sender.send(message, { registrationTokens: [ id ] }, function (err, response) {
        if(err) console.error(err);
       //else    console.log(response);
    });
  }
 function send_tweet_apn(tweet,id){
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600
    note['content-available'] = 1
    note.alert = 'There are pending tweets to judge.'
    note.payload = {'tweetid':String(tweet.tweetid),'topid':String(tweet.topid),'topic':String(tweet.topic),'messageFrom' : 'TREC RTS Mobile Judger'}
    apnConnection.pushNotification(note,new apn.Device(id))
  }


  function send_tweet(tweet){
    var currDevice = registrationIds[regIdx++];
    if(currDevice['type'] === 'gcm')
      send_tweet_gcm(tweet,currDevice['conn']);
    else if(currDevice['type'] === 'socket'){
      send_tweet_socket(tweet,currDevice['conn']);
    } else if(currDevice['type'] === 'apn'){
      send_tweet_apn(tweet,currDevice['conn'])
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

  function validate_participant(db,partid,cb){
    validate(db,'participants','partid',partid,cb);
  }
  function validate_client_or_participant(db,uniqid,cb){
    validate_client(db,uniqid,function(errors,results){
      if(errors || results.length === 0){
        validate_participant(db,partid,cb);
      }else{
        cb(errors,results);
      }
    });
  }
  function isValidTweet(str){
    return str.match('[0-9]=') !== null
  }
  
  router.get('/validate/part/:partid',function(req,res){
    var partid = req.params.partid;
    var db = req.db;
    validate_participant(db,partid,function(errors0,results0){
      if (errors || results.length === 0){
        res.status(500).json({'message': 'Unable to validate client: ' + clientid})
        return;
      }else{
        res.status(204).send()
      }
    });
  });

  router.post('/register/mobile/',function(req,res){
    var regid = req.body.regid;
    var partid = req.body.partid;
    var device = req.body.device;
    // At least one reg id required
    db.query('select * from participants where partid = ?;',partid,function(errors0,results0){
      if(errors0 || results0.length === 0){
        res.status(500).json({'message':'Unable to identify participant: ' + partid});
        return;
      }
      var idx = find_partid(partid)
      if ( idx === -1 ){
        if (device === "iOS")
          registrationIds.push({'partid':partid,'type':'apn','conn':regid});
        else
          registrationIds.push({'partid':partid,'type':'gcm','conn':regid});
        db.query('update table set deviceid = ? where partid = ?;',[regid,partid],function(errors1,results1){
          if(errors1){
            console.log('Unable to update device for partid: ', partid, regid);
          }
       });
      }else{
         registrationIds[idx].conn = regid;
         registrationIds[idx].type = device
         db.query('update table set deviceid = ? where partid = ?;',[regid,partid],function(errors1,results1){
           if(errors1){
             console.log('Unable to update device for partid: ', partid, regid);
           }
         });
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
  });
  
  router.post('/tweets/:topid/:clientid',function(req,res){
    var topid = req.params.topid;
    var clientid  = req.params.clientid;
    var tweets = req.body.tweets;
    var db = req.db;
    validate_client(db,clientid,function(errors,results){
      if (errors || results.length === 0){
        res.status(500).json({'message': 'Unable to validate client: ' + clientid})
        return;
      }
      stmt = ""
      for (var i = 0; i < tweets.length; i++){
        if (! isValidTweetID(tweets[i])){
          res.status(404).json({'message': 'Invalid tweetid: ' + tweets[i]});
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
      });
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
      db.query('select count(*) as cnt from requests_'+clientid+' where topid = ? and submitted between CURDATE() and date_add(CURDATE(),INTERVAL 1 day);', [topid], function(errors0,results0){
        if(errors0 || results0.length === 0){
          res.status(500).json({'message':'Could not process request for topid: ' + topid + ' and ' + tweetid});
          return;
        }else if(results0[0].cnt >= RATE_LIMIT){
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
        db.query('create table requests_digest_'+clientid+' like requests_template;'); // Assume this works for now
        res.json({'clientid':clientid});
      });
    });
  });
  
  router.get('/topics/available/:uniqid/:topid', function(req,res){
    var db = req.db;
    var uniqid = req.params.uniqid;
    var topid = req.params.topid;
    validate_client_or_participant(db,uniqid,function(errors0,results0){
      if(errors || results.length === 0){
        res.status(500).({'message':'Unable to validate ID:' + uniqid});
        return;
      }
      db.query('select count(*) as cnt where topic_assignments where topid = ?;',topid,function(errors1,results1){
        if(errors1 || results1.length === 0){
          res.status(500).json({'message';'Error in determining topic availability.'});
          return;
        }else if(results1[0].cnt >= MAX_ASS){
          res.status(404).json({'message':'Sufficient assessors'});
          return;
        }
        res.status(204).send();
      });
    });
  });
  router.post('/topics/interest/:partid',function(req,res){
    var partid = req.body.partid;
    var topids = req.body.topids;
    var db = req.db;
    validate_participant(db,partid,function(errors0,results0){
      if(errors0 || results0.length === 0){
        res.status(500).json({'message':'Unable to validate participant:'+partid});
        return
      }
      stmt = ""
      for (var i = 0; i < topids.length; i++){
        if (i !== 0){
          stmt += ',(\'' + topids[i] + '\',\'' + partid + '\')';
        } else {
          stmt += '(\'' + topids[i] + '\',\'' + partid + '\')';
        }  
      }
      db.query('insert into topic_assignments (topid,partid) values ' + [stmt],function(errors0,results0){
        if (errors)
          res.status(500).json({'message': 'Unable to insert topics for partid:' + partid});
        res.status(204).send()
      });
    });
  });
  router.get('/topics/interest/:partid',function(req,res){
    var partid = req.params.partid;
    var db = req.db;
    validate_participant(db,partid,function(errors0,results0){
      if(errors0 || results0.length === 0){
        res.status(500).json({'message':'Unable to validate participant:'+partid});
        return
      }
      db.query('select topid from topic_assignments where partid = ?;',partid,function(errors1,results1){
        if(errors1){
          res.status(500).json({'message':'Unable to fetch assigned topics for: ' + partid})
          return;
        }
        res.json(results)
      });
    });
  });
  router.post('/topics/suggest/:uniqid',function(req,res){
    var db = req.db;
    var uniqid = req.params.uniqid;
    var topics = req.body.topics;
    validate_client_or_participant(db,uniqid,function(errors0,results0){
      if(errors0 || results0.length === 0){
        res.status(500).json({'message':'Unable to validate: ' + uniqid})
        return;
      }
      stmt = ""
      for (var i = 0; i < topics.length; i++){
        if (i !== 0){
          stmt += ',(\'' + topics[i].title + '\',\'' + topics[i].desc + '\')';
        } else {
          stmt += '(\'' + topics[i].title + '\',\'' + topics[i].desc + '\')';
        }  
      }
      db.query('insert into candidate_topics (title,desc) values ' + [stmt],function(errors1,results1){
        if (errors1)
          res.status(500).json({'message': 'Unable to insert topic suggestions for:' + uniqid});
        res.status(204).send()
      });
    });
  });
  router.delete('/unregister/mobile/:partid',function(req,res){
    var partid = req.params.partid
    var idx = find_user(partid)
    if (idx > -1) registrationIds.splice(idx,1)
  });
  router.get('/topics/:uniqid', function(req,res){
    var uniqid = req.params.uniqid;
    var db = req.db;
    validate_client_or_participant(db,uniqid,function(errors,results){
      if(errors || results.length === 0){
        console.log(errors);
        res.status(500).json({'message':'Unable to validate ID: ' + uniqid});
        return;
      }
      db.query('select topid,query from topics;',function(errors1,results1){
        if(errors1){
          res.status(500).json({'message':'Unable to retrieve topics for client: ' + uniqid});
        }else{
          res.json(results1);
        }
      });
    });
  });


  io.on('connection', function(socket){
    socket.on('register',function(){
      console.log("Registered")
      registrationIds.push({'partid':socket,'type':'socket','conn':socket});
    });
    socket.on('judge',function(msg){
      console.log('Judged: ', msg.topid, msg.tweetid,msg.rel);
    });
    socket.once('disconnect',function(){
      console.log("Disconnect");
      var idx = find_user(socket);
      if (idx > -1) registrationIds.splice(idx,1);
    });
  });
  return router;
}
