#!/bin/bash

if [ -z "$JAVA_HOME" ]; then
  JAVA=` which java `
else
  JAVA=$JAVA_HOME/bin/java
fi

echo Java used: $JAVA

version=$($JAVA -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f2)
if [ $version != 8 ]; then
  echo "Java version != 8"
  exit 2;
else
  echo "Java version == 8"
fi

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

# collecting the baseline throughput running without asyncg
$SCRIPTDIR/baseline.sh
$SCRIPTDIR/nopromise.sh
$SCRIPTDIR/withpromise.sh

$SCRIPTDIR/plot6a.sh
$SCRIPTDIR/plot6b.sh
