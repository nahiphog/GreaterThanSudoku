import { createJigs, generateSolution } from './sudoku';
import { checkUniqueness } from './uniqueness';
import { digJigs, type DigMethod } from './digging';

self.onmessage=(event:MessageEvent<{size:number;method?:DigMethod}>)=>{
  const {size,method='single'}=event.data;
  let attempts=0;
  try{
    while(true){
      attempts++;
      self.postMessage({type:'progress',attempts,message:'Finding a unique puzzle with all region jigs…'});
      const grid=generateSolution(size),jigs=createJigs(grid);
      if(checkUniqueness(jigs,()=>{},size).count!==1)continue;
      const remaining=digJigs(jigs,size,p=>self.postMessage({type:'progress',attempts,message:`Digging: tested ${p.tested} / ${p.total} ${method==='rotational'?'pairs':'jigs'}; ${p.remaining} remain.`,...p}),Math.random,method);
      self.postMessage({type:'result',attempts,grid,jigs:remaining,total:jigs.length});return;
    }
  }catch(error){self.postMessage({type:'error',attempts,message:error instanceof Error?error.message:String(error)});}
};
