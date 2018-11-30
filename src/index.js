//DO NOT INSTRUMENT
/*******************************************************************************
 * Copyright 2018 Dynamic Analysis Group, Università della Svizzera Italiana (USI)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/

 // Author Haiyang Sun

(function(){
  const showPID = J$.showPID;
  J$.nativeLog = function(msg) {
    console.log("[AsyncG"+(showPID?("-"+process.pid):"")+"]",msg);
  }

  // disable some verbose information in performance-critical scenarios
  // the graph structure won't be changed
  J$.verbose = process.env["AsyncGVerbose"];

  J$.analysisPrefix = J$.asBuiltin?"asyncg":".";

  // basic instrumentation structure
  require(J$.analysisPrefix+"/instr");

  // support for process.nextTick/setTimeout/setInteval/setImmediate
  require(J$.analysisPrefix+"/simples");

  // support for event emitters
  require(J$.analysisPrefix+"/emitters");

  // enable the Jalangi analysis
  J$.addAnalysis(J$.instr);

  // option to enable/disable the promise feature
  if(!process.env["AsyncGDisablePromise"]) {
    // support for promises
    require(J$.analysisPrefix+"/promise");
    J$.addAnalysis(J$.promiseAnalysis);
  }

  // for long-term execution, dump the API usage information every some time
  if(process.env["AsyncGDumpInterval"]) {
    let interval = parseInt(process.env["AsyncGDumpInterval"]);
    // dump interval in seconds
    if(interval>0)
      setInterval(J$.dumpStats, interval*1000);
  }
})();
