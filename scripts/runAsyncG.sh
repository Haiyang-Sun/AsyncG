#!/bin/bash

# To make AsyncG work, you need to set the following env variables properly

SCRIPT=$(readlink -f "$0")
SCRIPTDIR=$(dirname "${SCRIPT}")

export AsyncGHome="${SCRIPTDIR}/../graalvm-asyncg-ae"

AnalysisLoader=$AsyncGHome/loader.js

AsyncGJS=$AsyncGHome/asyncg.js

# A general loader for NodeProf
export NODEPROFLOADER=$AnalysisLoader

# The entry of the AsyncG analysis including the settings
export NODEPROFANALYSIS=$AsyncGJS

# Required field to be able to instrument the internal libraries
export NODEPROFSCOPE=all


# Check AsyncG work
$AsyncGHome/bin/node --jvm --nodeprof --nodeprof.Scope=all $@

