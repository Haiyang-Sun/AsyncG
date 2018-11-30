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

  let stats_nextTick = J$.addTemplate(process.nextTick, "process.nextTick");
  J$.regTemplates.put(process.nextTick,
    new J$.RegTemplate(
      function createRegNode(iid, f, dis, args){
        let inNT = J$.curTick.func == J$.process_tickCallback;
        var lastCb = J$.ssTop?J$.ssTop.cb:undefined;
        var cb = args.shift()
        var result = new J$.RegNode(stats_nextTick, "process.nextTick", true, [cb], args);
        result.recursiveLevel = 0;
        result.checkValidContext = function(_iid, _f, _dis, _args){
          var res = J$.curTick.func == J$.process_tickCallback;
          if(res && inNT && lastCb && lastCb.iid == _iid) {
            //recursive
            result.recursiveLevel = lastCb.reg.recursiveLevel+1;
            if(result.recursiveLevel > 0) {
              //new "tick"
              //internally the recursive nextTick are just managed in a loop, but we visualize them as virtual ticks
              var curTick = new J$.Tick(J$.curTick.iid, J$.curTick.func);
              J$.curTick = curTick;
            }

            J$.logGraph("W", result.id, "recursive nextTick");
            if(result.recursiveLevel > 3) {
              process.exit(-1);
            }
          }
          return res;
        }
        return result;
      }
    )
  );

  var stats_setTimeout = J$.addTemplate(setTimeout, "setTimeout");

  J$.regTemplates.put(setTimeout,
    new J$.RegTemplate(
      function createRegNode(iid, f, dis, args){
        var cb = args.shift()
        var shownName = J$.verbose?("setTimeout_"+args[0]):"setTimeout";
        var result = new J$.RegNode(stats_setTimeout, shownName, true, [cb], args);
        result.checkValidContext = function(_iid, _f, _dis, _args) {
          return J$.curTick.func.name == "processTimers";
        }
        return result;
      }
    )
  );

  var stats_setInterval = J$.addTemplate(setInterval, "setInterval");
  J$.regTemplates.put(setInterval,
    new J$.RegTemplate(
      function createRegNode(iid, f, dis, args){
        var cb = args.shift()
        var shownName = J$.verbose?("setInterval_"+args[0]):"setInterval";
        var result = new J$.RegNode(stats_setInterval, shownName, false, [cb], args);
        result.checkValidContext = function(_iid, _f, _dis, _args) {
          return J$.curTick.func.name == "processTimers";
        }
        return result;
      }
    )
  );

  var stats_setImmediate = J$.addTemplate(setImmediate, "setImmediate");
  J$.regTemplates.put(setImmediate,
    new J$.RegTemplate(
      function createRegNode(iid, f, dis, args){
        var cb = args.shift()
        var result = new J$.RegNode(stats_setImmediate, "setImmediate", true, [cb], args);
        result.checkValidContext = function(_iid, _f, _dis, _args) {
          return J$.curTick.func.name == "processImmediate";
        }
        return result;
      }
    )
  );
})();
