#!/bin/bash
mysql trec_rts -e 'select clientid,groupid,alias from clients order by groupid;' | tail -n +2 > runs
if [ -e runs-dir ]
then
  rm -rf runs-dir
fi
mkdir runs-dir
rm clients
count=0
while read line
do
  clientid=$(echo ${line} | awk '{print $1}')
  groupid=$(echo ${line} | awk '{print $2}')
  alias=$(echo ${line} | awk '{print $3}')
  counter=$(printf "%02d" $count)
  group=${groupid%.*}
  runid=${group}-${alias}-${counter}
  echo ${runid}
  count=$((count + 1))
  if [ ! -e "${group}" ] 
  then
    mkdir runs-dir/${group}
  fi
  mysql trec_rts -e "select topid,tweetid,UNIX_TIMESTAMP(submitted) from requests_${clientid} where submitted > '2016-08-02 00:00:00Z' and submitted < '2016-08-11 23:59:59Z' order by topid,submitted;" | tail -n +2 | awk -vRUNID="${runid}" '{print $1,$2,$3,RUNID}' > runs-dir/${group}/${alias}-${counter}
  echo ${runid} >> clients
done < runs
paste runs clients > metadata
