function foo(){
  // console.log("foo");
}

var ee = require("events");

var e = new ee();

var e2 = new ee();


e.on("foo", foo);

e.on("data", foo);

e2.on("foo", foo);

e.emit("data");

e2.emit("foo");

foo();
