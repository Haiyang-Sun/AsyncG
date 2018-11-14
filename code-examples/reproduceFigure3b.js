let numComputed = 0;
function fib(n) {
  if(n < 2)
    return n;
  return fib(n-1) + fib(n-2);
}
function compute () {
  // make sure the example finishes
  fib(15);
  if(numComputed < 2)
    setImmediate ( compute );
  else {
    //"successful!"
    process.exit(0);
  }
}

// recursive nextTick will block the event queue
// As the bug can be reproduced with any I/O events,
// the example is simplied with a timer to avoid sending client requests
setInterval(function foo() {
  // anything
  numComputed++
}, 10);

compute() ;
