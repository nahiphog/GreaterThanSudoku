import { checkUniqueness } from './uniqueness';
import { solveWithSteps, type SolveFrame } from './logical-solver';
import { solveSix } from './six-solver';
import { TECHS } from './techniques';
import type { Jig } from './sudoku';
export type Tally = { name: string; count: number; score: number; steps: number[] };
export function solvePuzzle(jigs: Jig[], size: number, emit: (frame: SolveFrame)=>void, progress: (message:string)=>void=()=>{}, allowBacktracking=true) {
  return size===6 ? solveSix(jigs,emit,allowBacktracking) : solveWithSteps(jigs,emit,progress,allowBacktracking);
}
export function ratePuzzle(jigs: Jig[], size: number) {
  const tally: Tally[]=[];
  let step = 0;
  const backtrackingSteps:number[]=[];
  const result=solvePuzzle(jigs,size,frame=>{
    if(frame.kind!=='initial') step++;
    if(frame.kind==='backtracking') backtrackingSteps.push(step);
    if(frame.kind!=='logic') return;
    const score=Object.values(TECHS).find(t=>t.name===frame.title)?.score ?? 0;
    const item=tally.find(t=>t.name===frame.title);
    if(item) { item.count++; item.steps.push(step); } else tally.push({name:frame.title,count:1,score,steps:[step]});
  });
  if(result.bruteForceUses) tally.push({name:'Brute force (guessed branch)',count:result.bruteForceUses,score:10000,steps:backtrackingSteps});
  tally.sort((a,b)=>a.score-b.score || a.name.localeCompare(b.name));
  return {score:tally.reduce((sum,t)=>sum+t.score*t.count,0),tally,...result};
}

/** Public analysis entry points verify uniqueness before producing any rating or trace. */
export function rateUniquePuzzle(jigs: Jig[], size: number) {
  const count = checkUniqueness(jigs, () => {}, size).count;
  return { count, rating: count === 1 ? ratePuzzle(jigs, size) : null };
}
export function solveUniquePuzzle(jigs: Jig[], size: number, emit: (frame: SolveFrame) => void, progress: (message:string) => void = () => {}) {
  progress('Verifying uniqueness before starting the walkthrough…');
  if (checkUniqueness(jigs, progress, size).count !== 1) return null;
  return solvePuzzle(jigs, size, emit, progress);
}
