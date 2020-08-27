#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
export JAVA_HOME="${SCRIPTDIR}/../graalvm-ce-java8-20.1.0"

# clean the logs
key="ta-jsapi"

rm -f $HOMEDIR/logs/${key}.*

cd $HOMEDIR/acmeair-nodejs

echo "Running AcmeAir with TA (JS)"

export AsyncGDisablePromise=true
$JAVA_HOME/bin/node --jvm --vm.Dtruffle.class.path.append=$SCRIPTDIR/../instrbench.jar --nodeprof --experimental-options --require $SCRIPTDIR/../nodeprof-analysis/TypedArrayJSAPI.js ./app.js > $HOMEDIR/logs/$key.app.log &
pid=$!

sleep 30

echo "Running Jmeter to collect the results"

$HOMEDIR/scripts/runJmeter.sh $key

kill -9 $pid
wait $pid 2>/dev/null
$SCRIPTDIR/killAsyncG.sh

echo "Finished ${key} measurement"

