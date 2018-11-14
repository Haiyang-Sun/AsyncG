function foo(resolve, reject) {
  setTimeout(function(){
    resolve(1)
  },100);
}

function bar(){
  return 1;
}

function test1() {
  var p = new Promise(foo);
  p.then(bar);
}

function test2() {
  var p = new Promise(foo);
  p.then(bar).catch(err=>{console.trace(err)});
}

test1();

test2();
