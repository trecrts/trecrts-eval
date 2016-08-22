#!/bin/bash
mysql trec_rts -e 'select topid from topics;' | tail -n +2 | while read line
do
  mysql trec_rts -e "select assessor,tweetid,rel,UNIX_TIMESTAMP(submitted) from judgements_${line};" | tail -n +2 | awk -vTOP=${line} '{print TOP,$0}' 
done
