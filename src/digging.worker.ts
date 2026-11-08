import { createJigs, generateSolution } from './sudoku';
import { checkUniqueness } from './uniqueness';
import { digJigs } from './digging';

self.onmessage=(event:MessageEvent<{size:number}>)=>{
  const {size}=event.data;
  let attempts=0;
  try{
    while(true){
      attempts++;
      self.postMessage({type:'progress',attempts,message:'Finding a unique puzzle with all region jigs…'});
      const grid=generateSolution(size),jigs=createJigs(grid);
      if(checkUniqueness(jigs,()=>{},size).count!==1)continue;
      const remaining=digJigs(jigs,size,p=>self.postMessage({type:'progress',attempts,message:`Digging: tested ${p.tested} / ${p.total} jigs; ${p.remaining} remain.`,...p}));
      self.postMessage({type:'result',attempts,grid,jigs:remaining,total:jigs.length});return;
    }
  }catch(error){self.postMessage({type:'error',attempts,message:error instanceof Error?error.message:String(error)});}
};
