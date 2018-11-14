async function foo(){
  return Promise.resolve(1);//1;//Promise.resolve(1);
}
var p = foo();//baz();
p.then(
  (v)=> {
    return v;
  }
);
