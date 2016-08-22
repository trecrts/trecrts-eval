#!/bin/bash
mysql trec_rts -e 'select clientid from clients;'  | while read line; do echo $line $(mysql trec_rts -e "select count(*) from requests_${line}; "); done  | awk '{print $1,$3}'

