/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var hostname = ""
var GCM_SERVER = ""

var twttr = (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0],
            t = window.twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s);
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        fjs.parentNode.insertBefore(js, fjs);
        t._e = [];
        t.ready = function(f) {
            t._e.push(f);
          };
        return t;
        }(document, "script", "twitter-wjs"));

var regid = "";
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },

    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        $(window).on('beforeunload',function(evt){
            console.log("I am unloading")
            $.ajax({
                type: "DELETE",
                url: hostname + "/unregister/mobile/"+regid
            });    
        })
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        
    },
    removeTweet : function(topid,tweetid,rel){
        alert('Tweet removed');
        try{
        $("#div"+tweetid).remove();
        
        $.ajax({
            type: "POST",
            url: hostname + "/judge/"+topid+"/"+tweetid+"/"+rel
        });
        }catch(err){alert('RM: ' + err.message);}
    },
    addTweet : function (tweetid,topic,topid){
        $("#tweets").append('<div id="div'+tweetid+'"></div>');
        twttr.widgets.createTweet(tweetid,document.getElementById('div'+tweetid),{})
        .then(function(){
            $("#div"+tweetid).append("Is the tweet relevant to: " + topic );
            var relb = $('<button/>',{
                text: "\u2714",
                id:'rel'+tweetid,
                class: "judge rel",
                click: function(){
                  $("#div"+tweetid).remove();
        
                  $.ajax({
                    type: "POST",
                    url: hostname + "/judge/"+topid+"/"+tweetid+"/"+"1"
                  });
                }
            });
            var nrelb = $('<button/>',{
                text: "\u2718",
                id:'rel'+tweetid,
                class: "judge nrel",
                click:function(){
                  $("#div"+tweetid).remove();
        
                  $.ajax({
                    type: "POST",
                    url: hostname + "/judge/"+topid+"/"+tweetid+"/"+"1"
                  });
                }

            });
            $("#div"+tweetid).hammer().on({'swipeleft': function(){app.removeTweet(topid,tweetid,"-1");},'swiperight':function(){app.removeTweet(topid,tweetid,"1");}});
            $("#div"+tweetid).append(relb); 
            $("#div"+tweetid).append(nrelb); 
        });
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        //console.log(id)
        //console.log(window.plugins)
        //var pushNotification = window.plugins.pushNotification;
        //console.log(pushNotification)
        //pushNotification.register(app.successHandler, app.errorHandler,{"senderID":GCM_SERVER,"ecb":"app.onNotificationGCM"});
        //console.log('Received Event: ' + id);
        var push = PushNotification.init({
            android : { senderID : GCM_SERVER}
        });
        push.on('registration',function (data){
            
                if ( data.registrationId.length > 0 )
                {
                    regid = data.registrationId
                    console.log("Regid " + regid);
                    $.ajax({
                        type: "POST",
                        url: hostname + "/register/mobile",
                        data: JSON.stringify({"regid" : regid}),
                        contentType : "application/json",
                        dataType: "json"
                    }).fail(function(obj,err,thrown){
                        alert("Fail: " + err + " " + thrown);
                    });
                }
        });
        push.on('notification',function(data){
        //    alert("Received notification")
            var payload = data.additionalData
            //alert(JSON.stringify(payload))
            console.log(payload.tweetid);
            console.log(payload.topid);
            console.log(payload.topic);
            app.addTweet(payload.tweetid,payload.topic,payload.topid);
//            addTweet(payload.tweetid,payload.topic,payload.topid)

        });
        push.on('error',function(error){
            alert("Error occurred")
        });
    },
    successHandler: function(result) {
       //alert('Callback Success! Result = '+result);
    },
    errorHandler:function(error) {
        alert("Error found: " + error);
    },
    onNotificationGCM: function(e) {
        switch( e.event )
        {
            case 'registered':
                if ( e.regid.length > 0 )
                {
                    console.log("Regid " + e.regid);
                    $.ajax({
                        type: "POST",
                        url: hostname + "/register/mobile",
                        data: JSON.stringify({"regid" : e.regid}),
                        contentType : "application/json",
                        dataType: "json"
                    }).fail(function(obj,err,thrown){
                        alert("Fail: " + err + " " + thrown);
                    });
                }
            break;
 
            case 'message':
              // this is the actual push notification. its format depends on the data model from the push server
              //alert('message = '+e.message+' msgcnt = '+e.msgcnt);
              //twttr.widgets.createTweet(e.payload.tweetid,document.getElementById('tweet'),{});
              app.addTweet(e.payload.tweetid,e.payload.topic,e.payload.topid);
            break;
 
            case 'error':
              alert('GCM error = '+e.msg);
            break;
 
            default:
              alert('An unknown GCM event has occurred');
              break;
        }
    }
};

