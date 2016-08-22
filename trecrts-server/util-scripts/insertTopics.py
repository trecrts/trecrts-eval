import os,sys
import json
import MySQLdb


db = MySQLdb.connect('localhost','','','trec_rts')
cursor = db.cursor()

topicsfil = open(sys.argv[1])
topiclist = json.load(open(sys.argv[1]))
for topic in topiclist:
  topid=topic["topid"]
  title=topic["title"]
  desc=topic["description"]
  narr=topic["narrative"]
#  print('insert into topics (topid,title,description,narrative) values ("{0}","{1}","{2}","{3}");'.format(topid,title,desc,narr));
#  print('create table seen_{0}  like seen_templare;'.format(topid));
#  print('create table judgements_{0}  like judgements_templare;'.format(topid));
  print("Doing: ",topid)
  cursor.execute("""insert into topics (topid,title,description,narrative) values (%s,%s,%s,%s);""",(topid,title,desc,narr));
  cursor.execute('create table if not exists seen_{0}  like seen_template;'.format(topid));
  cursor.execute('create table if not exists judgements_{0}  like judgements_template;'.format(topid));

topicsfil.close()
db.commit()
db.close()
