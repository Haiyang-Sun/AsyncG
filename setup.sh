#!/bin/bash

# Author: Haiyang Sun
# Email: haiyang.sun@usi.ch
#

# 
# Setup AsyncG
#
SCRIPT=$(readlink -f "$0")
BASEDIR=$(dirname "${SCRIPT}")

mkdir -p $BASEDIR/logs

# Make sure you have git, mongodb, curl installed and Java 8 in your JAVA_HOME
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

# Download the customized GraalVM with AsyncG
if [ ! -d "${BASEDIR}/graalvm-asyncg-ae" ]; then
  wget http://h620.inf.usi.ch/asyncg/asyncg-ae.tar.gz
  tar xf asyncg-ae.tar.gz
fi

AsyncGHome="${BASEDIR}/graalvm-asyncg-ae"

./scripts/runExamples.sh

# Till now you have the AsyncG ready for use
echo "AsyncG ready for use"

#
# Setup AcmeAir for benchmarking
#

if [ ! -f "apache-jmeter-4.0.tgz" ]; then
  wget https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-4.0.tgz
  tar xf apache-jmeter-4.0.tgz 
fi

export JMETERHOME="${BASEDIR}/apache-jmeter-4.0"

$JMETERHOME/bin/jmeter --version

# A slightly modified acmeair node.js app using promises for mongo db
if [ ! -d "acmeair-nodejs" ]; then
  git clone https://github.com/Haiyang-Sun/acmeair-nodejs.git
fi

cd acmeair-nodejs;
$AsyncGHome/bin/npm install
$AsyncGHome/bin/node ./app.js > log &
pid=$!
echo "Running the AcmeAir app for the first time PID: ${pid}"
sleep 20 # wait until server ready

echo "Loading the default dataset"
# Load the default dataset
curl http://localhost:9080/rest/api/loader/load?numCustomers=10000

echo ""
echo "Loading finished, kill the server"
kill $pid
wait $pid 2>/dev/null

cd ..

if [ ! -d "acmeair-driver" ]; then
  git clone https://github.com/Haiyang-Sun/acmeair-driver.git
fi

cd acmeair-driver
./gradlew build
cp json-simple-1.1.1.jar $JMETERHOME/lib/ext/
cp acmeair-jmeter/build/libs/acmeair-jmeter-*-SNAPSHOT.jar $JMETERHOME/lib/ext/
cd ..
