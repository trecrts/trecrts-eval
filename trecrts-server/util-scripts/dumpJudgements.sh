#!/bin/bash
mysql trec_rts -e 'select topid from topics;' | tail -n +2 | while read line
do
  mysql trec_rts -e "select assessor,tweetid,rel,UNIX_TIMESTAMP(submitted) from judgements_${line} where submitted > '2016-08-02 00:00:00Z' and submitted < '2016-08-11 23:59:59Z' ;" | tail -n +2 | awk -vTOP=${line} '{print TOP,$0}' >> qrels.rts2016
done
