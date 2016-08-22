#!/bin/bash
if [ ! -e count.txt ] 
then
  echo 1 > count.txt
fi

userid=$(printf "SIGIR%03d"  $(cat count.txt))
echo ${userid}

count=$(cat count.txt)
count=$((count + 1))
echo ${count} > count.txt

mysql trec_rts -e "insert into participants (partid,email) values ('${userid}','batman@cave.org');"
