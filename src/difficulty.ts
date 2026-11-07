import { solveWithSteps, type SolveFrame } from './logical-solver';
import { solveSix } from './six-solver';
import { TECHS } from './techniques';
import type { Jig } from './sudoku';
export type Tally = { name: string; count: number; score: number };
export function solvePuzzle(jigs: Jig[], size: number, emit: (frame: SolveFrame)=>void, progress: (message:string)=>void=()=>{}, allowBacktracking=true) {
  return size===6 ? solveSix(jigs,emit,allowBacktracking) : solveWithSteps(jigs,emit,progress,allowBacktracking);
}
export function ratePuzzle(jigs: Jig[], size: number) {
  const tally: Tally[]=[];
  const result=solvePuzzle(jigs,size,frame=>{
    if(frame.kind!=='logic') return;
    const score=Object.values(TECHS).find(t=>t.name===frame.title)?.score ?? 0;
    const item=tally.find(t=>t.name===frame.title);
    if(item) item.count++; else tally.push({name:frame.title,count:1,score});
  });
  if(result.bruteForceUses) tally.push({name:'Brute force (guessed branch)',count:result.bruteForceUses,score:10000});
  tally.sort((a,b)=>a.score-b.score || a.name.localeCompare(b.name));
  return {score:tally.reduce((sum,t)=>sum+t.score*t.count,0),tally,...result};
}
