
function foo(resolve, reject){
  setTimeout(
    function(){
  resolve(1);
    },100);
};

var p = new Promise(foo);

function c(){
}
p.then( (v)=> {})
  .then( ()=>{throw e})
  .then(undefined, 
    function(e){
      throw e
    })
  .catch(c);
