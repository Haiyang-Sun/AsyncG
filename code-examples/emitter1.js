function foo(){
  //console.log("foo");
}

var ee = require("events");

var e = new ee();
e.on("data", foo);


e.on("foo", foo);

e.emit("data");

e.emit("foo");

foo();
