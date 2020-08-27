// DO NOT INSTRUMENT

let taResult = {};
function iidToLocation (iid) {
    return nodeprofAdapter.iidToLocation(iid);
}

function markArrayAsNonTyped(arrayObj, updateIID) {
    let iid = arrayObj.__ta__;
    if (iid && taResult[iid] == iid) {
        taResult[iid] = -updateIID;
        console.log('array marked as non-typed', iidToLocation(iid), iidToLocation(updateIID));
    }
}

function onAlloc(obj, iid) {
    obj.__ta__ = iid;
    if (!taResult[iid]) {
        console.log('array allocation at', iidToLocation(iid));
        taResult[iid] = iid;
    }
}

function onUpdate(arr, updateIID, ...objs) {
    if (arr.__ta__ && taResult[arr.__ta__]) {
        for (let obj of objs) {
            if (typeof obj != 'number') {
                markArrayAsNonTyped(arr, updateIID);
                return;
            }
        }
    }
}

let analysis = {
    literal: {
        post: (iid, type, val) => {
            if (type == 'ArrayLiteral') {
                onAlloc(val, iid);
                onUpdate(val, iid, ...val);
            }
        }
    },
    invoke: {
        post: (iid, func, base, ret, isNew, isInvoke, numArgs, ...args) => {
            if (func == Array) {
                onAlloc(ret, iid);
                onUpdate(ret, iid, ...ret);
                return;
            }
            if (base && base.__ta__ && taResult[base.__ta__]) {
                if (args.length != numArgs) {
                    if (isNew) {
                        [,...args] = args;
                    } else {
                        [,,...args] = args;
                    }
                }
                if (func == Array.prototype.push) {
                    onUpdate(base, iid, args[0]);
                } else if (func == Array.prototype.unshift) {
                    onUpdate(base, iid, ...args);
                } else if (func == Array.prototype.splice) {
                    let [,,...elems]=args;
                    onUpdate(base, iid, ...elems);
                }
            }
        }
    },
    element_write: {
        pre: (iid, arrayObj, prop, val) => {
            if (arrayObj.__ta__ && taResult[arrayObj.__ta__] && (typeof prop == 'number') ) {
                if (prop > arrayObj.length) {
                    markArrayAsNonTyped(arrayObj, iid);
                } else if (prop >= 0){
                    onUpdate(arrayObj, iid, val);
                }
            }
        }
    }
};

analysis.new = {
    post: analysis.invoke.post
};

setTimeout(()=>{
    nodeprofAdapter.addAnalysis(analysis);
}, (30+60*12)*1000);

setTimeout(()=>{
    nodeprofAdapter.disposeAnalysis();
}, (30+2*60*12)*1000);
