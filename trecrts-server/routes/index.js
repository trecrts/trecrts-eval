var express = require('express');
var router = express.Router();
var gcm = require('node-gcm')
var sender = new gcm.Sender();
var registrationIds = [];
var tweet_queue = [];
 

function send_tweet(tweetid){
  var message = new gcm.Message();
  message.addData('message',"You have pending tweets to judge.");
  message.addData('title','TREC RTS CrowdJudge' );
  message.addData('tweetid',String(tweetid))
  message.addData('msgcnt','1'); // Shows up in the notification in the status bar
  message.timeToLive = 3000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.
  message.addNotification({title: 'TREC RTS CrowdJudge', body : 'You have pending tweets to judge.', icon: 'ic_launcher'});
  sender.send(message, registrationIds, 4, function (result) {
    console.log(result);
  });
}

router.post('/register/',function(req,res){
  var regid = req.body.regid;
  // At least one reg id required
  if ( registrationIds.indexOf(regid) === -1){
    registrationIds.push(regid);
    console.log(regid);    
  }
  res.status(204).send();
  if(tweet_queue.length > 0){
    for(var i = 0; i < tweet_queue.length; i++){
      send_tweet(tweet_queue[i]);
    }
    tweet_queue = [];
  }
});

router.post('/tweet/:tweetid',function(req,res){
  var tweetid = req.params.tweetid;
  if(registrationIds.length > 0){
    send_tweet(tweetid);  
  }else{
    tweet_queue.push(tweetid);
  }
  res.status(204).send();
});

router.post('/judge/:tweetid/:rel', function(req,res){
  var tweetid = req.params.tweetid;
  var rel = req.params.rel;
  res.status(204).send();
  console.log(tweetid,rel);
});

module.exports = router;
