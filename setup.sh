#!/bin/bash

# Author: Haiyang Sun
# Email: haiyang.sun@usi.ch
#

# 
# Setup AsyncG
#

echo "The snapshot of the AcmeAir benchmark on which this artifact is based on contains some vulnerabilities in the dependent NPM modules. The benchmark is developed by a third-party, and not by us, so we decided to import it \"as is\" to ensure that the benchmark can be executed unmodified. However, this might expose the benchmarking machine to some vulnerabilities"
while true; do
    read -p "press Y to continue or N to exit: " yn
    case $yn in
        [Yy]* ) make install; break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

SCRIPT=$(readlink -f "$0")
BASEDIR=$(dirname "${SCRIPT}")

mkdir -p $BASEDIR/logs

# Delete downloaded stuff and re-setup
rm -rf acmeair-driver acmeair-nodejs apache-jmeter-4.0 graalvm-asyncg-ae asyncg-ae.tar.gz  apache-jmeter-4.0.tgz

# Download the customized GraalVM with AsyncG
if [ ! -d "${BASEDIR}/graalvm-asyncg-ae" ]; then
  wget http://h620.inf.usi.ch/asyncg/asyncg-ae.tar.gz
  tar xf asyncg-ae.tar.gz
fi

AsyncGHome="${BASEDIR}/graalvm-asyncg-ae"


# Make sure you have git, mongodb, curl installed and Java 8 in your JAVA_HOME

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
echo ""
echo "[Note]: the warnings above about npm packages result from the original AcmeAir benchmark."

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
