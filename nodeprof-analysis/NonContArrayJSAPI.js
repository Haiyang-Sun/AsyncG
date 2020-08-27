// DO NOT INSTRUMENT


let ncaReports = {};
nodeprofAdapter.addAnalysis({
    element_write: {
        pre: (iid, receiver, prop, val) => {
            if (ncaReports[iid])
                return;
            if (receiver instanceof Array && (typeof prop == 'number') && prop > receiver.length) {
                ncaReports[iid] = true;
                console.log('non-cont-array', nodeprofAdapter.iidToLocation(iid));
            }
        }
    }
});
