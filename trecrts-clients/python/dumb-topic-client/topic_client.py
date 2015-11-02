from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream
import requests
import json
import argparse

cred_file = "oauth_tokens.txt"
hostname = ""
port = ""
clientid = ""
topics = dict()
api_base = ""

class TopicListener(StreamListener):

  def on_status(self,status):
    for topid,query in topics.items():
      if hasattr(status,'retweeted_status'):
        break;
      text = status.text.lower()
      if text.find(query) >= 0:
        print status.id,text
        resp = requests.post(api_base % ("tweet/%s/%s/%s" %(topid,status.id,clientid)))
        print resp.status_code
    return True

  def on_error(self,status_code):
    print status_code

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description="TREC Real-Time Summarization Dummy Client")
  parser.add_argument('--host',help="Hostname of broker",type=str,required=True)
  parser.add_argument('--port',help="Port number of broker",type=str,required=True)
  parser.add_argument('--oauth',help="File to read JSON encoded OAuth credentials",type=str,)
  args=parser.parse_args()
  hostname = args.host
  port = args.port
  api_base= "http://%s:%s/" % (hostname,port)
  api_base += "%s"
  if args.oauth:
    cred_file = args.oauth

  resp = requests.post(api_base % ("register/system"),data={"groupid":"uwar"})
  clientid = resp.json()["clientid"]

  resp = requests.get(api_base % ("topics/%s" % clientid))
  for row in resp.json():
    topics[row["topid"]] = row["query"].lower()

  oauth = json.load(open('oauth_tokens.txt'))


  listener = TopicListener()
  auth = OAuthHandler(oauth["consumer_key"],oauth["consumer_secret"])
  auth.set_access_token(oauth["access_token"],oauth["access_token_secret"])

  stream = Stream(auth,listener)
  stream.sample(languages=['en'])
