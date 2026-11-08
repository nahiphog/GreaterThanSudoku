import type { Jig } from './sudoku';
import { checkUniqueness } from './uniqueness';

export type DigProgress = { tested:number; total:number; remaining:number };
/** Input must already be verified unique. Every accepted removal preserves uniqueness. */
export function digJigs(jigs:Jig[],size:number,progress:(p:DigProgress)=>void=()=>{},random:()=>number=Math.random){
  const order=[...jigs];
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  let remaining=[...jigs];
  for(const [index,jig] of order.entries()){
    const trial=remaining.filter(j=>j!==jig);
    if(checkUniqueness(trial,()=>{},size).count===1)remaining=trial;
    progress({tested:index+1,total:order.length,remaining:remaining.length});
  }
  // A rejected removal cannot become unique after other constraints are removed.
  // One shuffled pass therefore leaves no individually removable jig.
  return remaining;
}
