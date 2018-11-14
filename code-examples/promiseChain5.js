var p1 = new Promise(function(res, rej){
  res(1);
});

var p2 = Promise.resolve(1);

// var p3 = Promise.reject(0);

var p4 = p1.then(v => { return v+1; });

var p5 = Promise.all([p4,p2]);

p5.then(vs => { return vs+1; });
// var p6 = Promise.race([p4,p2]);

// p3.catch(err => {});
