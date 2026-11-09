import { createJigs, type Grid } from './sudoku';
import { checkUniqueness } from './uniqueness';
import { digJigs, type DigMethod } from './digging';
import { ratePuzzle } from './difficulty';
import { encodeCompactPuzzle } from './compact';

export type SimulationMode='difficulty'|'jigs';
export function analyzeSimulationTrial(solution:Grid,mode:SimulationMode,dig:boolean,threshold:number,method:DigMethod='single'){
  const size=solution.length;
  let jigs=createJigs(solution);
  if(checkUniqueness(jigs,()=>{},size).count!==1)return null;
  if(mode==='jigs' || dig)jigs=digJigs(jigs,size,undefined,Math.random,method);
  const jigCount=jigs.length;
  // Jig-count simulation never invokes the difficulty solver or constructs a trace.
  const rating=mode==='difficulty'?ratePuzzle(jigs,size):undefined;
  const metric=rating?rating.score:jigCount;
  return {jigCount,score:rating?.score,tally:rating?.tally,string:encodeCompactPuzzle(jigs,size),metric,matches:mode==='difficulty'?metric>=threshold:jigCount<=threshold};
}
