import { generateSolution } from './sudoku';
import { customJigs } from './custom-layout';
import { checkUniqueness } from './uniqueness';
import { ratePuzzle } from './difficulty';
import { encodeCompactPuzzle } from './compact';

self.onmessage=(event:MessageEvent<{size:number;selected:boolean[];minimum:number;maximum:number}>)=>{
  const {size,selected,minimum,maximum}=event.data;
  let attempts=0,lastProgress=0;
  try {
    while(true){
      attempts++;
      const grid=generateSolution(size),jigs=customJigs(grid,selected);
      const check=checkUniqueness(jigs,()=>{},size);
      if(check.count===1){
        const rating=ratePuzzle(jigs,size);
        // Match the sister builder: accept only puzzles solved without search.
        if(!rating.usedBacktracking&&rating.score>=minimum&&rating.score<=maximum){
          self.postMessage({type:'result',attempts,grid,string:encodeCompactPuzzle(jigs,size),...rating});return;
        }
      }
      if(performance.now()-lastProgress>100){self.postMessage({type:'progress',attempts});lastProgress=performance.now();}
    }
  }catch(error){self.postMessage({type:'error',attempts,message:error instanceof Error?error.message:String(error)});}
};
