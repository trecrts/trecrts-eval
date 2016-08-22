#!/bin/bash
LANG=C
rm x 
mysql trec_rts -e 'select clientid from clients;'  | tail -n +2 |  while read line; do mysql trec_rts -e "select * from requests_${line} where submitted > '2016-07-30 00:00:00'; " | tail -n +2; done | awk '{print $1"-"$2}' | sort -u > x
mysql trec_rts -e 'select partid from participants;' | tail -n +2 | while read line; do
  rm y t &> /dev/null
  mysql trec_rts -e "select topid from topic_assignments where partid = '${line}';" | tail -n +2 | sort -u > t
  for i in $(cat t)
  do
    mysql trec_rts -e "select tweetid from judgements_${i} where assessor = '${line}' and submitted > '2016-07-30 00:00:00';" | tail -n +2 | sed "s_^_${i}-_" >> y
  done
  if [ ! -e y ]
  then
    echo "${line} has not selected any topics $(cat t)"
    continue
  fi
  egrep "$(cat t | tr '\n' '|' | head -c -1)" x > x2
  echo ${line} $(wc -l < y) $(wc -l < x2)  
done
