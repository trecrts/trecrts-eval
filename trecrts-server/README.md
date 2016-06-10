# TREC RTS Evaluation Broker REST(ful) API

## Client Endpoints

### POST /register/system

- Request body should be a JSON object as follows: `{"groupid":"trec group identifier","alias":"system alias"}`
- The `groupid` will be provided by the organizers.
- The `alias` is a human-friendly identifier that you specify to help identify the client, e.g., `WaterlooBaseline`. We will use this alias as the "runid" to report results (e.g., in the track overview paper), so usual TREC rules apply (e.g., no spaces).

Use this API endpoint to register a client with the evaluation broker.
The API call will return a JSON object of the client id to be used by the system when making requests, e.g., `{"clientid":"abcdefghijk"}`.

Note that each call to this API endpoint will return a unique client id. Therefore, for each individual experimental run, you should request a separate client id.

You can manually test this API with `curl` as follows:

```
curl -H 'Content-Type: application/json' --data '{"groupid":"mygroup","alias":"MyBaseline"}' hostname.com/register/system
```

### GET /topics/:clientid

- **:clientid** is the client id that was returned by the broker above. This is used for bookkeeping/rate-limiting purposes.

Use this API endpoint to request the topics to be evaluated.
This is a JSON array of pairs of topic identifier (topid), the 
TREC title (the information need), and the body (which may be the description and/or narrative in a traditional TREC topic).
For example, `[{"topid":"test","title":"birthday","description" : "Tweets pertaining to birthdays, including wishing happy birthday.","narrative" : "A narrative about birthdays."}]`.

You can manually test this API with `curl` as follows:

```
curl -H 'Content-Type: application/json' hostname.com/topics/abcdefghijk
```

### POST /tweet/:topid/:tweetid/:clientid

- **:topid** specifies the topic identifier.
- **:tweetid** specifies the id of the tweet from the Twitter Streaming API that was identified as being relevant to the topic.
- **:clientid** is the client's identifier that was returned when the system was registered. This is used for bookkeeping/rate-limiting purposes.

Use this API endpoint to submit a tweet for assessment with respect to a particular topic. Returns a 204 status code on success.

You can manually test this API with `curl` as follows:

```
curl -X POST -H 'Content-Type: application/json' hostname.com/tweet/MBXXX/738418531520352258/abcdefghijk
```

## Mobile Assessor Endpoints

Note that these API endpoints are documented for completeness only. System participants will not need to use these APIs.

### POST /register/mobile
  - Request body a JSON object containing:`{"regid":"Push notification id","partid" : "The participant id", "deviceid" : "iOS and/or Android"}`
    + used for pushing tweets to the device

Register an instance of the mobile app so that we can push topics and tweets to the mobile phone.
Users should specify their participant id as a means of authentication to receive push notifications. 
The deviceid field is used to determine which style of push notification to use.

### POST /tweet/:topid/:tweetid/:rel/:partid
  - **:topid** specifies the topic identifier
  - **:tweetid** specifies the tweet identifier supplied by the Twitter Streaming API 
  - **:rel** is the relevance assessment (-1 or 1) of tweet to the topic
  - **:partid** is the participant identifier used to track assessments by each mobile assessor

Mobile app has submited a relevance assessment for a (tweet,topic) pair for assessment. 
Returns a 204 status code on success.

