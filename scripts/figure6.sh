#!/bin/bash


SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")
HOMEDIR=$SCRIPTDIR/..
AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

# For simplicity, we use the Java 8 provided by the GraalVM, you can also use your own Java 8
export JAVA_HOME=$AsyncGHome
JAVA=$JAVA_HOME/bin/java

echo Java used: $JAVA

version=$($JAVA -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f2)
if [ $version != 8 ]; then
  echo "Java version != 8"
  exit 2;
else
  echo "Java version == 8"
fi

# collecting the baseline throughput running without asyncg
$SCRIPTDIR/baseline.sh
$SCRIPTDIR/nopromise.sh
$SCRIPTDIR/withpromise.sh

$SCRIPTDIR/plot6a.sh
$SCRIPTDIR/plot6b.sh
