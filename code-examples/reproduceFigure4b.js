const EventEmitter = require("events");
var ee = new EventEmitter();
var p = new Promise(
  resolve => { resolve(0); }
);

p.then(() => {
  ee.on('foo', () => {
      //...
  })
  return 1;
}).catch((err)=>{});

setImmediate(()=> {ee.emit('foo')});
