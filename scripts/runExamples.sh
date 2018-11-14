#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")

HOMEDIR=$SCRIPTDIR/..

export AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

# This 'AsyncVerbose' option will add a bit more information, e.g.,:
#   the invocation location of some nodes, enabling some corner cases bug detection.
# With these extra information, the performance can be a bit slower.
export AsyncVerbose=true

AnalysisLoader=$AsyncGHome/loader.js

AsyncGJS=$AsyncGHome/asyncg.js

# A general loader for NodeProf
export NODEPROFLOADER=$AnalysisLoader

# The entry of the AsyncG analysis including the settings
export NODEPROFANALYSIS=$AsyncGJS

# Required field to be able to instrument the internal libraries
export NODEPROFSCOPE=all

cd $HOMEDIR

for f in `ls code-examples/*.js`
do
  echo "running AsyncG for "$f;
  # running without --jvm will run substratevm which launches faster
  $AsyncGHome/bin/node --nodeprof --nodeprof.Scope=all $f > $f.txt
  #$AsyncGHome/bin/node --jvm --nodeprof --nodeprof.Scope=all $f > $f.txt
  numN=`cat $f.txt | grep "\[AsyncG.*\] N" | wc -l` 
  numE=`cat $f.txt | grep "\[AsyncG.*\] E" | wc -l`
  echo "finished. # nodes / edges in the log: "$numN" / "$numE
done

