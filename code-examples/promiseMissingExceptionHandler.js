function foo(resolve, reject){
  setTimeout(
    function(){
        resolve(1);
    },100);
};

var p = new Promise(foo);

p.then( (v)=>{ return v+1; })
  .then((v)=>{})
