

// the resolved value 1 is never used in any reaction
var p1 = new Promise((resolve, reject)=>{resolve(1);});

var p2 = new Promise((resolve, reject)=>{resolve(1);});

//the explicitly returned value 2 is not used in any reaction
p2.then((v)=>{return 2;});
