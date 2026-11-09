import type { Jig } from './sudoku';
import { checkUniqueness } from './uniqueness';

export type DigProgress = { tested:number; total:number; remaining:number };
export type DigMethod = 'single' | 'rotational';
export function rotationalPosition(jig:Jig,size:number){
  return {row:size-1-jig.row-(jig.direction==='vertical'?1:0),col:size-1-jig.col-(jig.direction==='horizontal'?1:0),direction:jig.direction};
}
const positionKey=(jig:Pick<Jig,'row'|'col'|'direction'>)=>`${jig.row},${jig.col},${jig.direction}`;
export function diggingGroups(jigs:Jig[],size:number,method:DigMethod):Jig[][]{
  if(method==='single')return jigs.map(jig=>[jig]);
  const byPosition=new Map(jigs.map(jig=>[positionKey(jig),jig])),seen=new Set<Jig>(),groups:Jig[][]=[];
  for(const jig of jigs){
    if(seen.has(jig))continue;
    const partner=byPosition.get(positionKey(rotationalPosition(jig,size)));
    if(!partner||partner===jig)throw new Error('Rotational digging requires paired jig positions.');
    groups.push([jig,partner]);seen.add(jig);seen.add(partner);
  }
  return groups;
}
/** Input must already be verified unique. Every accepted removal preserves uniqueness. */
export function digJigs(jigs:Jig[],size:number,progress:(p:DigProgress)=>void=()=>{},random:()=>number=Math.random,method:DigMethod='single'){
  const order=diggingGroups(jigs,size,method);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  let remaining=[...jigs];
  for(const [index,group] of order.entries()){
    const trial=remaining.filter(j=>!group.includes(j));
    if(checkUniqueness(trial,()=>{},size).count===1)remaining=trial;
    progress({tested:index+1,total:order.length,remaining:remaining.length});
  }
  // A rejected removal cannot become unique after other constraints are removed.
  // One shuffled pass leaves no removable group for the chosen method.
  return remaining;
}
