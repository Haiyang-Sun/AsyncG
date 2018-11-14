#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

$AsyncGHome/bin/node $HOMEDIR/scripts/plot6a.js $HOMEDIR/logs/baseline.jtl $HOMEDIR/logs/nopromise.jtl $HOMEDIR/logs/withpromise.jtl > $HOMEDIR/figures/figure6a.csv

cd $HOMEDIR/figures
gnuplot figure6a.gpi > figure6a.eps
