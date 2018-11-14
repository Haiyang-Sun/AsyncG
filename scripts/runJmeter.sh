#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..

mkdir -p $HOMEDIR/logs

export JMETERHOME="${HOMEDIR}/apache-jmeter-4.0"

CONFIGDIR=$HOMEDIR/acmeair-driver/acmeair-jmeter/scripts

# Output to three log files
$JMETERHOME/bin/jmeter -DusePureIDs=true -n -t $CONFIGDIR/AcmeAir.jmx -j $HOMEDIR/logs/$1.log -l $HOMEDIR/logs/$1.jtl > $HOMEDIR/logs/$1.records
