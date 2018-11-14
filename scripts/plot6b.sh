#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

cat $HOMEDIR/logs/withpromise.app.log | grep Period > $HOMEDIR/logs/period.csv

$AsyncGHome/bin/node $SCRIPTDIR/plot6b.js $HOMEDIR/logs/withpromise.jtl $HOMEDIR/logs/period.csv > $HOMEDIR/figures/figure6b.csv

cd $HOMEDIR/figures
gnuplot figure6b.gpi > figure6b.eps
