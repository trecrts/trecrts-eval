# Broker REST(ful) API

Resource URL will depend on your broker location. We report only the common suffixes.


## Client Endpoints

### POST /register/system
  - Request body a JSON object containing:`{"groupid":"trec group identifier"}`
    + used for validation

Register a client system using the group identifier provided in the request body
Returns a JSON object of the client identifier to be used by the system when making requests,
e.g., `{"clientid":"foobar123"}`.

#### GET /topics/:clientid
  - **:clientid** is the client's identifier that was returned when the system was registered
    + This is used for bookkeeping/rate-limiting purposes

Client is requesting the current topics to process. This is a JSON array of pairs of topic identifier (topid)
and query (the information need). For example, `[{"topid":"test","query":"birthday"}]`.

### POST /tweet/:topid/:tweetid/:clientid
  - **:topid** specifies the topic identifier
  - **:tweetid** specifies the tweet identifier supplied by the Twitter Streaming API 
  - **:clientid** is the client's identifier that was returned when the system was registered
    + This is used for bookkeeping/rate-limiting purposes

Submit a (tweet,topic) pair for assessment. Returns a 204 status code on success.

### POST /tweets/:topid/:clientid
  - **:topid** specifies the topic identifier
  - **:clientid** is the client's identifier that was returned when the system was registered

The body of the request should contain a JSON object with a field denoted 'tweets' with a JSON array of tweetid strings,
e.g., '{"tweets":["123","456"]}'.

This submits a system's daily digest set of tweets. Can be done in batches but only the first X will be used for evaluation (X is given in the guidelines).

 Returns a 204 status code on success.

### GET /judge/:topid/:tweetid/:clientid
  - **:topid** specifies the topic identifier
  - **:tweetid** specifies the tweet identifier supplied by the Twitter Streaming API 
  - **:clientid** is the client's identifier that was returned when the system was registered
    + This is used for bookkeeping/rate-limiting purposes

Request the relevance assessment for  a (tweet,topic) pair. Returns a 200 status code and a JSON object containing:
`{'tweetid':tweetid,'topid':topid,'rel':rel}`, where rel is either -1 (not relevant), 1 (relevance), and 0 (unjudged).
The tweet identifier and topic identifier are repeated for verification purposes.

## Mobile Assessor Endpoints

### POST /register/mobile
  - Request body a JSON object containing:`{"regid":"GCM registration id"}`
    + used for pushing tweets to the device

Register an instance of the mobile app so that we can push topics and tweets to the mobile phone.
This will eventually return a JSON object containing the participant identifier which will be
used for bookkeeping.

### POST /tweet/:topid/:tweetid/:rel
  - **:topid** specifies the topic identifier
  - **:tweetid** specifies the tweet identifier supplied by the Twitter Streaming API 
  - **:rel** is the relevance assessment (-1 or 1) of tweet to the topic

Mobile app has submited a relevance assessment for a (tweet,topic) pair for assessment. 
Returns a 204 status code on success.

