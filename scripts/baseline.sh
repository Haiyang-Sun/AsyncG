#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
export JAVA_HOME="${SCRIPTDIR}/../graalvm-ce-java8-20.1.0"
AsyncGHome=$JAVA_HOME

# clean the logs
key="baseline-20.1.0"

rm -f $HOMEDIR/logs/${key}.*

cd $HOMEDIR/acmeair-nodejs

echo "Running AcmeAir without AsyncG"
$AsyncGHome/bin/node --jvm ./app.js > $HOMEDIR/logs/$key.app.log &
pid=$!

sleep 30

echo "Running Jmeter to collect the results"

$HOMEDIR/scripts/runJmeter.sh $key

kill $pid
wait $pid 2>/dev/null

echo "Finished ${key} measurement"
