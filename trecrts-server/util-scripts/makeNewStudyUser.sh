#!/bin/bash
if [ $# -ne 1 ]
then
  echo "Provide the user's email address"
  exit 1
fi
if [ ! -e count.txt ] 
then
  echo 1 > count.txt
fi

b=$(bash genRandom.sh 1)
userid=$(printf "RTS%02d%s"  $(cat count.txt) $b)
echo ${userid}

count=$(cat count.txt)
count=$((count + 1))
echo ${count} > count.txt

mysql trec_rts -e "insert into participants (partid,email) values ('${userid}','${1}');"
