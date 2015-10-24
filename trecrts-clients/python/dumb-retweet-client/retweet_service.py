##########################
####
# WARNING: THIS FILE IS DEPRECATED AND IS ONLY RETAINED FOR INFORMATIONAL PURPOSES
# ../dumb_topic_client is the up-to-date sample program
###
#########################

from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream
import requests

cred_file = "oauth_tokens.txt"
seen_tweets = set()

class RetweetListener(StreamListener):

  def on_status(self,status):
    #print(status.text.encode('utf8'))
    if hasattr(status,'retweeted_status'):
      rt_status = status.retweeted_status
#      print status.retweeted_status.id, status.retweeted_status.retweet_count
      if rt_status.retweet_count > 10000 and rt_status.id not in seen_tweets:
        print rt_status.id, rt_status.retweet_count,
        resp = requests.post("http://XXX/tweet/%s"%rt_status.id)
        print resp.status_code
        seen_tweets.add(rt_status.id)
    return True

  def on_error(self,status_code):
    print status_code

if __name__ == '__main__':
  oauth = json.load(open('oauth_tokens.txt'))
  listener = RetweetListener()
  auth = OAuthHandler(oauth["consumer_key"],oauth["consumer_secret"])
  auth.set_access_token(oauth["access_token"],oauth["access_token_secret"])

  stream = Stream(auth,listener)
  stream.sample(languages=['en'])
