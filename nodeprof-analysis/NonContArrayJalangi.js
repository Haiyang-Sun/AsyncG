// JALANGI DO NOT INSTRUMENT

function iidToLocation(iid) {
    if (J$.sid) {
        return J$.iidToLocation(J$.sid, iid);
    } else {
        return J$.iidToLocation(iid);
    }
}

let ncaReports = {};
J$.analysis = ({
    putFieldPre: (iid, receiver, prop, val, isComputed) => {
        if (ncaReports[iid])
            return;
        if (isComputed && receiver instanceof Array && (typeof prop == 'number') && prop > receiver.length) {
            ncaReports[iid] = true;
            console.log('non-cont-array', iidToLocation(iid));
        }
    }
});
