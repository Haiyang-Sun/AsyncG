#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

# clean the logs
key="nopromise"

rm -f $HOMEDIR/logs/${key}.*

cd $HOMEDIR/acmeair-nodejs

echo "Running AcmeAir with AsyncG (Promise feature disabled)"

export AsyncGDisablePromise=true
$SCRIPTDIR/runAsyncG.sh ./app.js > $HOMEDIR/logs/$key.app.log &
pid=$!

sleep 30

echo "Running Jmeter to collect the results"

$HOMEDIR/scripts/runJmeter.sh $key

kill -9 $pid
wait $pid 2>/dev/null
$SCRIPTDIR/killAsyncG.sh

echo "Finished ${key} measurement"

