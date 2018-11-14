var a = new Promise((res, rej)=>{
  setTimeout(
    function(){res(1);}, 100
  );
});

a.then(
  (res)=>{return res+1;}
).then(
  (res)=>{return res+2;}
)
