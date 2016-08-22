#!/bin/bash
mysql trec_rts -e 'show tables;'| grep judgements | grep -v template  | while read line; do echo $line $(mysql trec_rts -e "select count(*) from ${line} where  submitted > '2016-07-30 00:00:00'; "); done  | awk '{print $1,$3}'

