#!/bin/bash
mysql trec_rts -e 'select topid from topics;' | tail -n +2 | while read line
do
  mysql trec_rts -e "select * from judgements_${line} where assessor = '${1}';" | tail -n +2 | awk -vTOP=${line} '{print TOP,$0}'
done
