const EventEmitter = require("events");
var ee = new EventEmitter();
var p = new Promise(
  resolve => { resolve(0); }
);

//resolved in a different loop
p.then(() => {
  //unused listener
  ee.on('foo', () => {
      //...
  })  
}); //missing exception handler

//dead emit
ee.emit('foo');

