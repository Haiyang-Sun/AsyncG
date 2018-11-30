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
  let promiseUniqueId = 0;

  let stats_Promise = J$.addTemplate(Promise, "Promise");

  let promiseConstructorCb = undefined;

  let nativeActionFuncs = J$.nativeActionFuncs = J$.getHashMap();
  let nativeActionFuncsFilter = J$.nativeActionFuncsFilter = J$.getHashMap("_native_action_filter_");

  let promiseMap = J$.promiseMap = J$.getHashMap();

  let stats_Promise_catch = J$.addTemplate(Promise.prototype.catch, "Promise.catch");

  let stats_Promise_then = J$.addTemplate(Promise.prototype.then, "Promise.then");

  J$.addPermanentInstr(Promise.resolve);

  J$.addPermanentInstr(Promise.reject);

  J$.addPermanentInstr(Promise.all);

  J$.addPermanentInstr(Promise.race);

  let PromiseObjectNode = function(iid){
    this.id = J$.uniqueId++;
    this.awaits = [];
    this.promiseId = promiseUniqueId++;
    this.setAction = function(actionNode) {
      if(!this.action) {
        this.action = actionNode;
        J$.logGraph("E", "O", this.action.id, this.id, "action");
      }
    }
    this.setCreate = function (createNode){
      J$.logGraph("E", "O", createNode.id, this.id, "creates");
    }
    J$.logGraph("N", this.id, "P", "p"+this.promiseId, J$.iidToLocation(iid?iid:0));
  }

  function ActionNode (isResolve){
    this.id = J$.uniqueId++;
    this.isResolve = isResolve;
  }

  function resolveAsync(iid, val, p){
    // J$.assert(p instanceof Promise)
    let toPromiseObject = promiseMap.get(p);
    if(!toPromiseObject) // due to map removal
      return;
    if(val instanceof Promise) {
      let valObj = promiseMap.get(val);
      //TODO
      toPromiseObject.linkFrom = valObj;
      J$.logGraph("E", "O", valObj.id, toPromiseObject.id, "link");
    }else {
      let actionNode = new ActionNode(true);
      toPromiseObject.setAction(actionNode);
      J$.logGraph("N", actionNode.id, "A", "v", J$.iidToLocation(J$.getLastInvoke()));
      J$.logGraph("E", "O", actionNode.id, toPromiseObject.id, "async_resolve");
    }
  }

  function AwaitNode (){
    this.id = J$.uniqueId++;
  }

  let asyncRootRet = undefined;

  let asyncRet = undefined;

  function PromiseAnalysis(){
    this.promisePre = function (name, f, dis, args) {
      J$.instr.functionEnter(0, f, dis, args);
    };
    this.promisePost = function (name, f, dis, args, returnVal) {
      J$.instr.functionExit(0, returnVal);
    };

    this.asyncRootPost = function(iid, ret, p, isGenerator, e){
      if(p)
        resolveAsync(iid, ret, p);
    }
    this.awaitPre = function(iid, val) {
      if(val instanceof Promise) {
        let awaitPromiseObject = promiseMap.get(val);
        if(!awaitPromiseObject) // map removal
          return;
        let awaitNode = new AwaitNode();
        J$.logGraph("N", awaitNode.id, "A", "await", J$.iidToLocation(J$.getLastInvoke()));
        J$.logGraph("E", "O", awaitNode.id, awaitPromiseObject.id, "awaits");

        awaitPromiseObject.awaits.push(awaitNode);
        if(awaitPromiseObject.linkFrom) {
          awaitPromiseObject.linkFrom.awaits.push(awaitNode);
        }
      }
    }


    J$.regTemplates.put(Promise,
      new J$.RegTemplate(
        function createRegNode(iid, f, dis, args){

          let cb = args[0];
          promiseConstructorCb = cb;
          let result = new J$.RegNode(stats_Promise, "Promise", true, [cb]);
          result.removeCbLater = !J$.rootFilter.containsKey(cb);
          J$.rootFilter.put(cb, true);
          if(J$.checkNativeFunc(cb)){
            result = undefined;
            J$.rootFilter.remove(cb);
          }
          return result;

        }
      )
    );

    J$.functionEnterListeners.push(function(prevTop, iid, f, dis, args) {
      //special handler for emit

      if(promiseConstructorCb && promiseConstructorCb == f){
        if(J$.verbose){
          J$.assert(prevTop.reg && prevTop.reg.removeCbLater);
        }
        J$.rootFilter.remove(promiseConstructorCb)
        promiseConstructorCb = undefined;
        let resolve = args[0];
        let reject = args[1];
        // J$.invokeFilter.put(resolve, true);
        // J$.invokeFilter.put(reject, true);
        nativeActionFuncs.put(resolve, {isResolve: true, reg: prevTop.reg});
        nativeActionFuncs.put(reject, {isResolve: false, reg: prevTop.reg});

        nativeActionFuncsFilter.put(resolve, true);
        nativeActionFuncsFilter.put(reject, true);
        // J$.rootFilter.put(resolve, true);
        // J$.rootFilter.put(reject, true);
        // J$.nativeLog("adding "+resolve);
        test = resolve;
      }
    });

    J$.functionExitListeners.push(function(prevTop, iid, returnVal, wrappedExceptionVal){
      if(prevTop.func == Promise.all || prevTop.func == Promise.race) {
        let all = prevTop.func == Promise.all;
        let returnP = promiseMap.get(returnVal);
        if(!returnP)
          return;
        let promises = prevTop.args[0];

        returnP.mergeFrom = []
        for(var p of promises) {
          let from = promiseMap.get(p);
          if(from)
            J$.logGraph("E", "O", from.id, returnP.id, all?"all":"race");
          returnP.mergeFrom.push(from);
        }
        return;
      }
      if(prevTop.func == Promise.resolve || prevTop.func == Promise.reject) {
        // console.log(J$.iidToLocation(J$.getLastInvoke()));
        if(J$.ssTop && (J$.ssTop.func == Promise.all || J$.ssTop.func == Promise.race))
        {
          return;
        }
        let isResolve = prevTop.func == Promise.resolve;
        let actionNode = new ActionNode(isResolve);
        J$.logGraph("N", actionNode.id, "A", isResolve?"resolve":"reject", J$.iidToLocation(J$.getLastInvoke()));
        J$.addHappenIn(actionNode);
        let retP = promiseMap.get(returnVal);
        if(retP)
          retP.setAction(actionNode);
        return;
      } else if(prevTop.func == Promise) {
        let newPromise = new PromiseObjectNode(J$.getLastInvoke());
        // console.log("creating promise "+newPromise.promiseId);
        promiseMap.put(returnVal, newPromise);
        if(prevTop.reg && prevTop.reg.removeCbLater){
          newPromise.reg =  prevTop.reg;

          prevTop.reg.promiseObject = newPromise;
          newPromise.setCreate(prevTop.reg);
        }else if(J$.ssTop && (J$.ssTop.func == Promise.prototype.then)){
          newPromise.reg =  J$.ssTop.reg;
          if(newPromise.reg) {
            J$.ssTop.reg.promiseObject = newPromise;
            newPromise.setCreate(J$.ssTop.reg)
          }
        }else if(J$.ssTop && (J$.ssTop.func == Promise.resolve || J$.ssTop.func == Promise.reject)){

        }else if(J$.ssTop && (J$.ssTop.func == Promise.all || J$.ssTop.func == Promise.race)){

        }else {
        }
        if(newPromise.reg) {
          //put back the action resolved in the constructor
          if(newPromise.reg.action) {
            newPromise.reg.promiseObject.setAction(newPromise.reg.action);
          }
        }

        //J$.lastInvoke.length>0?J$.iidToLocation(J$.lastInvoke[J$.lastInvoke.length-1]):"");
      } else if(prevTop.func == Promise.prototype.then || prevTop.func == Promise.prototype.catch) {
        let promiseObj = promiseMap.get(prevTop.dis);
        let retObj = promiseMap.get(returnVal);

        if(prevTop.reg) {
          if(promiseObj && retObj)
            J$.logGraph("E", "O", promiseObj.id, retObj.id, (J$.ssTop && J$.ssTop.func == Promise.prototype.catch)?"catch":"then");
        }
        if(retObj && J$.ssTop && J$.ssTop.func == Promise.prototype.catch){
          retObj.reg =  J$.ssTop.reg;
          if(retObj.reg) {
            retObj.reg.promiseObject = retObj;

            // J$.logGraph("N", retObj.id, "P", "p"+retObj.promiseId, J$.getLastInvoke());
            J$.logGraph("E", "O", J$.ssTop.reg.id, retObj.id, "creates");
          }
        }
        // thenCbs.put(prevTop.args[0], {isResolve: true, then: thenObj});
        // thenCbs.put(prevTop.args[1], {isResolve: false, then: thenObj});
      } else if(prevTop.cb && prevTop.cb.reg.promiseObject) {
        let responsiblePromise = prevTop.cb.reg.promiseObject;
        // console.log("cb reg "+prevTop.cb.reg);
        if(returnVal instanceof Promise) {
          let retObj = promiseMap.get(returnVal);
          if(retObj) {
            responsiblePromise.linkFrom = retObj;
            J$.logGraph("E", "O", retObj.id, responsiblePromise.id, "link");
          }
        }else {

          let isReject = wrappedExceptionVal;

          if(J$.verbose) {
            J$.assert(prevTop.cb.reg.name.startsWith("Promise.then") || prevTop.cb.reg.name == "Promise.catch");
          }
          let actionNode = new ActionNode(!isReject);
          if(!responsiblePromise.action)
            responsiblePromise.setAction (actionNode);
          let valueUndefined = isReject?(wrappedExceptionVal==undefined):(returnVal==undefined);
          J$.logGraph("N", actionNode.id, "A", (isReject?"reject":"resolve")+(valueUndefined?"_undefined":""), J$.iidToLocation(J$.getLastInvoke()));
          J$.logGraph("E", "H", prevTop.cb.id, actionNode.id);

        }
      }
    });

    function Sub(){
      this.invokeFun = function(iid, f, dis, args, ret) {

        if(nativeActionFuncs.containsKey(f)){

          let action = nativeActionFuncs.get(f);
          let isResolve = action.isResolve;

          let actionNode = new ActionNode(isResolve);
          J$.logGraph("N", actionNode.id, "A", isResolve?"resolve":"reject", J$.iidToLocation(J$.getLastInvoke()));
          J$.addHappenIn(actionNode);

          if(action.reg.promiseObject) {
            if(!action.reg.promiseObject.action) {
              action.reg.promiseObject.setAction ( actionNode);
            }
            //todo, if if resolve happens before await, need to check the action of a resolved promise
            for (var awaitNode of action.reg.promiseObject.awaits) {
              J$.logGraph("E", "await-resolve", actionNode.id, awaitNode.id);
            }
          }else {
            action.reg.action = actionNode;
          }
        }
      };
      this.invokeFun.filterKey = "_native_action_filter_";
    }
    J$.addAnalysis(new Sub(), {internal: false, excludes: ""});
    function foreachUpperPromise(p, cb){
      if(p.linkFrom) // delegates
          return foreachUpperPromise(p.linkFrom, cb);
      if(p.mergeFrom) {
        for(var f of p.mergeFrom) {
          foreachUpperPromise(f, cb);
        }
      }
      cb(p);
    }

    J$.regTemplates.put(Promise.prototype.then,
      new J$.RegTemplate(
        function createRegNode(iid, f, dis, args){
          let cbResolve = args[0];
          let cbReject = args[1];
          if( J$.checkNativeFunc(cbReject) || J$.checkNativeFunc(cbReject)){
            return undefined;
          }
          // use a two bit value to represent the resolve/reject reactions
          let v = ""
          if(cbResolve)
            v += "1";
          else
            v += "0";
          if(cbReject)
            v += "1"
          else
            v += "0";
          let result = new J$.RegNode(stats_Promise_then, "Promise.then_"+v, true, [cbResolve, cbReject], [], {then: dis} );

          if(J$.ssTop && J$.ssTop.func == Promise.prototype.catch) {
            return;
          }

          result.checkValidContext = function(_iid, _f, _dis, _args){
            let promiseObj = promiseMap.get(dis);
            // J$.assert(promiseObj.reg);
            let res = [];
            if(promiseObj) {
              foreachUpperPromise(promiseObj, function(p){
                if(p.action) {
                  res.push(p.action);
                  if(!promiseObj.outAction){
                    promiseObj.outAction = true;
                    J$.logGraph("E", "PA", p.action.id, promiseObj.id);
                  }
                }
              });
            }

            return res;
          }
          return result;
        }
      )
    );

    J$.regTemplates.put(Promise.prototype.catch,
      new J$.RegTemplate(
        function createRegNode(iid, f, dis, args){
          let cb = args[0];
          let result = new J$.RegNode(stats_Promise_catch, "Promise.catch", true, [cb], [], {catch: dis} );
          result.checkValidContext = function(_iid, _f, _dis, _args){
            let promiseObj = promiseMap.get(dis);
            // J$.assert(promiseObj.reg);

            let res = [];
            if(promiseObj) {
              foreachUpperPromise(promiseObj, function(p){
                if(p.action) {
                  res.push(p.action);
                  if(!promiseObj.outAction){
                    promiseObj.outAction = true;
                    J$.logGraph("E", "PA", p.action.id, promiseObj.id);
                  }
                }
              });
            }

            return res;
          };
          return result;

        }
      )
    );
  }

  J$.promiseAnalysis = new PromiseAnalysis();

})();
