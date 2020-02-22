const sleep = (secs) => {
  return new Promise(function(){
    setTimeout(() => {
      console.log("execute after 2 seconds")
       resolve(true)
  }, secs);
  }) 
}

const filterMapReduce = (ary) => {
  let result= ary.sort((a,b)=>{return a>b?1:-1})

  let result=ary.filter((value)=>{reutrn value!='3'})
  let result= ary.map((value)=>{return value.a})
 
}

console.log([{a: '6'}, {a: '2'}, {a: '3'}, {a: '5'}])