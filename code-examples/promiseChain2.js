function foo(resolve, reject) {
  resolve(1);
}

function foo2(resolve, reject) {
  setTimeout(function(){
    resolve(1)
  },100);
}
var p1 = new Promise(foo2);

foo(function(){});

function bar(){
  return new Promise(foo);
}

function test() {
  p1.then(bar).then(bar);
}

test();
