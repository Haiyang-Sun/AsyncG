// DO NOT INSTRUMENT
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
  function SetupInstr(){
    let mapId = 0;
    // fake an object mapping by storing a field in the object
    // can be replaced by using java.util.HashMap provided by the Graal.js
    function FakeHM(key){
      this.id = key?key:"__AG__"+(mapId++);
      this.containsKey = function(obj) {
        if(!obj)
          return false;
        return obj.hasOwnProperty(this.id);
      }
      this.put = function(obj, value) {
        if(!obj)
          return;
        obj[this.id] = value;
      }
      this.get = function(obj) {
        if(!obj)
          return;
        return obj[this.id];
      }
      this.remove = function(obj) {
        if(!obj)
          return;
        var ret = obj[this.id];
        delete obj[this.id];
        return ret;
      }
      this.size = function(){
        return 0;
      }
      this.clear = function(){
      }
    }

    J$.getHashMap = function(key){
      return new FakeHM(key);
    }

    let bufferWrite = [];

    J$.startTime = new Date();

    function dumpBuffer(out){
      for(var i = 0; i < bufferWrite.length; i++) {
        out(bufferWrite[i].toString());
      }
      bufferWrite = [];
    }

    J$.getLastInvoke = function (){
      if(!J$.verbose)
        return 0;
      if(J$.lastInvoke.length > 0)
        return J$.lastInvoke[J$.lastInvoke.length-1];
      return 0;
    }

    J$.logGraph = function (... args){
      if(args[0] != 'L' && args[0] != 'W') {
        if(J$.curTick) {
          // ignore empty ticks
          J$.curTick.verify();
        }
      }
      bufferWrite.push(args);
      if(bufferWrite.length > 200) {
        dumpBuffer(J$.nativeLog);
      }
    }

    J$.assert = function(cond, msg){
      if(!cond){
        console.trace(msg);
        process.exit(1);
      }
    }

    // storing all APIs that are scheduling callbacks
    // API => RegTemplate
    let regTemplates = J$.regTemplates = J$.getHashMap();

    J$.permanentInstr = [];

    J$.addPermanentInstr = function(func) {
      J$.permanentInstr.push(func);
      J$.rootFilter.put(func, true);
    }

    J$.addTemplate = function(func, name){
      J$.addPermanentInstr(func);
      let result = {
        numRegistered: 0,
        numExecuted: 0,
      };
      J$.report.enabledAPIs[name] = result;
      return result;
    }

    let enableRootFilter = true;

    let rootFilter = J$.rootFilter = J$.getHashMap("__asyncg_filter__");

    // track this for nextTick
    J$.process_tickCallback = process._tickCallback;
    J$.addPermanentInstr(process._tickCallback);

    function Report() {
      this.enabledAPIs = {};
    }

    var report = J$.report = new Report();

    // for each register API, a template includes information processing it
    J$.RegTemplate = function (createRegNode){
      this.createRegNode = createRegNode;
    }

    // a auto-incremental id for any place need a unique id
    J$.uniqueId = 0;
    // tick index
    J$.tickIdx = 0;
    // the current tick
    J$.curTick = undefined;


    J$.checkNativeFunc = function(func) {
      return (func+"").indexOf("[native code]") > -1;
    }

    J$.CbNode = function(reg, iid, f, dis, args){
      this.id = J$.uniqueId++;
      this.reg = reg;
      this.iid = iid;
      this.f = f;
      this.dis = dis;
      this.args = args;
    }

    // represents a call to a register API
    J$.RegNode = function(stats, name, once, cbs, uniqueArgs, objectBinding){
      this.stats = stats;
      stats.numRegistered++;
      this.id = J$.uniqueId++;
      this.name = name;
      this.once = once;
      this.cbs = cbs;
      // if(!J$.fastmode) {
      this.isNative = false;
      for(var cb of this.cbs){
        if(J$.checkNativeFunc(cb)){
          this.isNative = true;
          break;
        }
      }
      // }


      this.uniqueArgs = uniqueArgs;
      this.objectBinding = objectBinding;

      this.finished = false;

      this.dumpNode = function(locIID){
        if(J$.verbose) {
          // we can compare the hashcode of functions and function strings
          // to detect corner-case bugs like invalid function removal
          var hashcodes = "";
          for(var cb of this.cbs) {
            if(cb) {
              // append hashcode for the function and its string representation hash
              // for debugging
              hashcodes += J$.getHashcode(cb)+":"+J$.getHashcode(""+cb)+":";
            }
          }
          J$.logGraph("N", this.id, "R", this.name, J$.iidToLocation(locIID), hashcodes);
        }else
          J$.logGraph("N", this.id, "R", this.name, J$.iidToLocation(locIID));
      }

      this.foreachCb = function(handler){
        for(var cb of this.cbs){
          handler(cb);
        }
      }

      //return true or the node triggering the execution
      this.checkValidContext = function(ss){
        return true;
      }
      this.onCbExecuted =function(iid, f, dis, args){
        if(this.once) {
          this.finished = true;
        }
        this.stats.numExecuted++;
        return new J$.CbNode(this, iid, f, dis, args);
      }
    }

    /* per-run state */
    var shadowstack = J$.shadowstack = [];
    // callback => RegNode
    var pendingRegs = J$.pendingRegs = J$.getHashMap();

    /* end per-run state */
    var Tick = J$.Tick = function(iid, f){
      this.iid = iid;
      this.name = J$.iidToLocation(iid);
      this.func = f;
      this.verified = false;
      this.verify = function(){
        if(this.verified)
          return;
        this.verified = true;
        this.idx = J$.tickIdx++;
        J$.logGraph("L", J$.curTick.idx, J$.curTick.name);
      }
    }

    J$.ssTop = undefined;

    J$.lastInvoke = [];

    function Sub(){
      this.invokeFunPre = function(iid) {
        J$.lastInvoke.push(iid);
      }

      this.invokeFun = function(iid, f, dis, args, ret) {
        J$.lastInvoke.pop();
      }
    }

    if(J$.verbose) {
      // add extra invocation information to the graph
      J$.addAnalysis(new Sub(), {internal:false, excludes:""});
    }

    J$.cleanRootFilter = function(){
      // clear old functions
      J$.rootFilter.clear();
    }

    this.stackEnter = function(iid, f, dis, args) {
      // ignore the first empty tick
      if(J$.iidToLocation(iid) != "(*internal/modules/cjs/helpers.js:17:3:24:4)") {
        J$.curTick = new Tick(iid, f);
      }
    }

    this.stackExit = function(iid) {}

    function ssEnter(iid, f, dis, args) {
      var elem = {iid: iid, func: f, dis:dis, args: args};
      shadowstack.push(elem);

      var oldTop = J$.ssTop;
      J$.ssTop = elem;
      return oldTop;
    }

    function ssExit(iid) {
      let top = shadowstack.pop();
      J$.ssTop = shadowstack[shadowstack.length-1];
      // J$.assert(!top || top.iid == iid);
      return top;
    }

    const LinkedList = require(J$.analysisPrefix+"/linkedlist");
    J$.LinkedList = LinkedList;

    J$.functionEnterListeners = [];

    J$.functionExitListeners = [];

    J$.addHappenIn = function(otherNode){
      for(var i = shadowstack.length - 1; i >= 0; i--){
        var item = shadowstack[i];
        if(item.cb){
          J$.logGraph("E", "H", item.cb.id, otherNode.id);
          break;
        }
      }
    }
    this.functionEnter = function (iid, f, dis, args) {
      if(f == J$.process_tickCallback) {
        // as nextTick are special ticks, we identify nextTick by identifying
        // the _tickCallback function
        J$.curTick = new Tick(iid, f);
      }
      let regNode;
      if(regTemplates.containsKey(f)) {
        J$.curTick.verify();
        var template = regTemplates.get(f);
        //create the regNode
        regNode = template.createRegNode(iid, f, dis, args);

        if(regNode) {
          //add to pending queue
          regNode.foreachCb(
            function(cb){
              if(typeof cb == 'function') {
                J$.rootFilter.put(cb, true);
                var list;
                if(!pendingRegs.containsKey(cb)){
                  list = new LinkedList(100);
                  pendingRegs.put(cb, list);
                }else {
                  list = pendingRegs.get(cb);
                }
                list.push(regNode);
                //list.add(regNode);
              }else {
                //TODO, add warning here
              }
            }
          )
          regNode.dumpNode(J$.getLastInvoke());
          J$.addHappenIn(regNode);
        }
      }

      //check if this function is caused by a register
      let cbNode;
      if(pendingRegs.containsKey(f)){
        let list = pendingRegs.get(f);
        list.forEach(
          function(pending, node) {
            if(pending.finished) {
              list.remove(node);
              return;
            }
            let validationResult = pending.checkValidContext(iid, f, dis, args);
            if(validationResult){
              J$.curTick.verify();
              cbNode = pending.onCbExecuted(iid, f, dis, args);
              cbNode.reg = pending;
              J$.logGraph("N", cbNode.id, "C", f.name, J$.iidToLocation(iid));
              if(validationResult == true) {
                J$.logGraph("E", "R", pending.id, cbNode.id);
                return true;
              }else {
                //have a emitter edge
                if(Array.isArray(validationResult)) {
                  for(var r of validationResult) {
                    // assert(r.id);
                    cbNode.action = r;
                    J$.logGraph("E", "R", pending.id, r.id);
                    J$.logGraph("E", "R", r.id, cbNode.id);
                  }
                  return validationResult.length > 0;
                } else {
                  // assert(validationResult.id);
                  cbNode.action = validationResult;
                  J$.logGraph("E", "R", pending.id, validationResult.id);
                  J$.logGraph("E", "R", validationResult.id, cbNode.id);
                  return true;
                }
              }
            }
          }
        );
        if(list.length == 0) {
          pendingRegs.remove(f);
        }
      }

      var prevTop = ssEnter(iid, f, dis, args);

      J$.ssTop.reg = regNode;
      J$.ssTop.cb = cbNode;


      for(var l of J$.functionEnterListeners){
        l(prevTop, iid, f, dis, args);
      }

    };

    this.functionEnter.filterKey = "__asyncg_filter__";
    //for shadow stack
    this.functionExit = function (iid, returnVal, wrappedExceptionVal) {
      var prevTop = J$.ssTop;
      ssExit(iid);
      for(var l of J$.functionExitListeners){
        l(prevTop, iid, returnVal, wrappedExceptionVal);
      }
    };

    this.functionExit.filterKey = "__asyncg_filter__";

    var headerPrinted = false;

    function endOneRun(out){
      dumpBuffer(out);
      out(JSON.stringify(J$.report),null,1);
      J$.instr.cleanMemory();
    }

    J$.dumpStats = function (){
      J$.disableAnalysis();
      var out = J$.nativeLog;//console.log;
      var lineOfReport = "Period," + (new Date() - J$.startTime)/1000+"";
      if(!headerPrinted) {
        var header =  "Period,Time";
        for(var key in J$.report.enabledAPIs){
          header+=","+key+"(R)"+","+key+"(C)";
        }
        out(header);
        headerPrinted = true;
      }
      for(var key in J$.report.enabledAPIs){
        var report = J$.report.enabledAPIs[key];
        lineOfReport += ","+report.numRegistered+","+report.numExecuted
        report.numRegistered = 0;
        report.numExecuted = 0;
      }
      out(lineOfReport);
      J$.enableAnalysis();
    }

    this.endExecution = function(){
      J$.disableAnalysis();
      endOneRun(J$.nativeLog);
    }

    this.cleanMemory = function() {
      shadowstack = [];
      pendingRegs.clear();
      J$.cleanRootFilter();
    }
  }
  if(!J$.instr){
    J$.instr = new SetupInstr();
    J$.endOneRun = function(out){
      endOneRun(out);
    }
  }
})();
