function foo(){
  //console.trace(2);
  setTimeout(bar, 1000);
}

function bar(){
  process.nextTick(t);

  t();
  process.nextTick(t);
}

function t(){

}

t();

t();

process.nextTick(foo);


process.nextTick(t);

//console.trace(1);

setImmediate(t);
