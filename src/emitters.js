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
  const EventEmitter = require("events");

  // stack now have info for emit
  J$.addPermanentInstr(EventEmitter.prototype.emit);

  function EmitNode (emitter, eventName){
    this.id = J$.uniqueId++;
    this.emitter = emitter;
    this.eventName = eventName;
  }

  function RemoveNode (emitter, eventName, f) {
    this.id = J$.uniqueId++;
    this.emitter = emitter;
    this.eventName = eventName;
    this.f = f;
  }

  let emitterId = 0;
  function EmitterObjectNode (emitter, iid) {
    this.id = J$.uniqueId++;
    this.emitter = emitter;
    this.iid = iid;
    this.plotIfNotPlotted = function(){
      if(!this.plotted) {
        J$.logGraph("N", this.id, "E", ++emitterId, J$.iidToLocation(this.iid));
        this.plotted = true;
      }
    }
  }
  // track the use of removing emitter events
  J$.addPermanentInstr(EventEmitter.prototype.removeListener);

  // monitor non-register and non-cb function usage (emit and removeListener)
  J$.functionEnterListeners.push(function(prevTop, iid, f, dis, args) {
    if(f == EventEmitter.prototype.emit) {
      if(emittersMap.containsKey(dis)) {
        let emitterObjNode = emittersMap.get(dis);
        let emitNode = new EmitNode(dis, args[0]);
        // store the emit information in the shadow stack
        J$.ssTop.emit  = emitNode;
        emitterObjNode.plotIfNotPlotted();

        // J$.addHappenIn(emitNode);
        J$.logGraph("N", emitNode.id, "A", "emit:"+emitNode.eventName, J$.iidToLocation(J$.getLastInvoke()));
        J$.logGraph("E", "O", emitterObjNode.id, emitNode.id, "emit")
      }
    }else if(J$.verbose && f == EventEmitter.prototype.removeListener){
      if(emittersMap.containsKey(dis)) {
        let removeNode = new RemoveNode(dis, args[0], args[1]);
        let emitterObjNode = emittersMap.get(dis);
        emitterObjNode.plotIfNotPlotted();

        J$.logGraph("X", removeNode.id, args[0], J$.getHashcode(args[1]), J$.getHashcode(""+args[1]));
        J$.logGraph("E", "X", emitterObjNode.id, removeNode.id, "remove_"+args[0])
        // J$.addHappenIn(removeNode);
      }
    }
  });

  // constructor
  J$.addPermanentInstr(EventEmitter);
  let emittersMap = J$.emittersMap = J$.getHashMap();
  J$.functionExitListeners.push(function(prevTop, iid, returnVal, wrappedExceptionVal){
    // object binding for event emitters
    if(prevTop && prevTop.func == EventEmitter)
    {
      emittersMap.put(returnVal, new EmitterObjectNode(returnVal, J$.getLastInvoke()));
      if(prevTop.dis) {
        emittersMap.put(prevTop.dis, new EmitterObjectNode(prevTop.dis, J$.getLastInvoke()));
      }
    }
  });

  let stats_on = J$.addTemplate(EventEmitter.prototype.on, "Emitter.on");
  J$.regTemplates.put(EventEmitter.prototype.on,
    new J$.RegTemplate(
      function createRegNode(iid, f, dis, args){
        let emitterObjNode = emittersMap.get(dis);
        // we ignore emitter obj node that occur before profiling enabled
        if(!emitterObjNode) //emitter early stage
          return;

        let eventName = args[0];

        let cb = args[1];
        let once = false;
        let result = new J$.RegNode(stats_on, eventName, once, [cb], [eventName], {ee: dis});

        if(emitterObjNode) {
          emitterObjNode.plotIfNotPlotted();
          J$.logGraph("E", "O", emitterObjNode.id, result.id);
        }
        result.checkValidContext = function(_iid, _f, _dis, _args) {
          if(!J$.ssTop)
            return;
          // check context of emit
          let result = J$.ssTop.emit && J$.ssTop.func == EventEmitter.prototype.emit && J$.ssTop.emit.emitter == dis && eventName == J$.ssTop.emit.eventName;
          if(result) {
            result = J$.ssTop.emit;
          }
          return result;
        }
        return result;
      }
    )
  );


})();
