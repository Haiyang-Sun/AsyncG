// JALANGI DO NOT INSTRUMENT

let taResult = {};

function iidToLocation(iid) {
    if (J$.sid) {
        return J$.iidToLocation(J$.sid, iid);
    } else {
        return J$.iidToLocation(iid);
    }
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

J$.analysis = ({
    literal: (iid, val, any, type) => {
        if (!type || type == 'ArrayLiteral') {
            if (type || val instanceof Array) {
                onAlloc(val, iid);
                onUpdate(val, iid, ...val);
            }
        }
    },
    invokeFun: (iid, func, base, args, ret) => {
        if (func == Array) {
            onAlloc(ret, iid);
            onUpdate(ret, iid, ...ret);
            return;
        }
        if (base && base.__ta__ && taResult[base.__ta__]) {
            if (func == Array.prototype.push) {
                onUpdate(base, iid, args[0]);
            } else if (func == Array.prototype.unshift) {
                onUpdate(base, iid, ...args);
            } else if (func == Array.prototype.splice) {
                let [,,...elems]=args;
                onUpdate(base, iid, ...elems);
            }
        }
    },
    putFieldPre: (iid, arrayObj, prop, val, isComputed) => {
        if (arrayObj && arrayObj.__ta__ && taResult[arrayObj.__ta__] && isComputed && (typeof prop == 'number') ) {
            if (prop > arrayObj.length) {
                markArrayAsNonTyped(arrayObj, iid);
            } else if (prop >= 0){
                onUpdate(arrayObj, iid, val);
            }
        }
    }
});
