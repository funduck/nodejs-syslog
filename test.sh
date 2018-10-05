#!/bin/bash

dir=`dirname $0`
stamp=`date +%s`
key="nodejs-syslog $stamp"
socket="/dev/log"
log_files="/var/log/*.log"

# Writes message $key to syslog via $socket and checks that it is in log files $log_files
# test.sh --debug   for debug

node index.js "$socket" "$key" "user" "warn" $1

c=`grep "$key" $log_files | grep -c "$key"`

if [ $c = 1 ]; then
    echo "\033[32m ok\033[m"
    exit 0
else
    echo $c
    echo "\033[31m no message in $log_files, may be $socket doesn't lead to syslog?\033[m"
    exit 1
fi
