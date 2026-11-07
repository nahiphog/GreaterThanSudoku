import { openMatches, saveMatches } from './simulation-store';
import { generateSolution, createJigs } from './sudoku';
import { encodeCompactPuzzle } from './compact';
import { rateUniquePuzzle, type Tally } from './difficulty';
export type Match = { trial:number; solution:number[][]; score:number; string:string; tally:Tally[] };
self.onmessage=async event=>{
  const {trials,size,threshold,database}=event.data;
  let completed=0,unique=0,skipped=0,sum=0,min=Infinity,max=0,last=performance.now();
  let matches: Match[]=[];
  let db: IDBDatabase | undefined, matchCount=0;
  try {
    db=await openMatches(database);
    for(let trial=1;trial<=trials;trial++) {
      const solution=generateSolution(size), jigs=createJigs(solution), {rating}=rateUniquePuzzle(jigs,size);
      completed++;
      if (rating) {
        unique++; sum+=rating.score;min=Math.min(min,rating.score);max=Math.max(max,rating.score);
        if(rating.score>=threshold) matches.push({trial,solution,score:rating.score,string:encodeCompactPuzzle(jigs,size),tally:rating.tally});
      } else skipped++;
      if(performance.now()-last>150 || trial===trials) {
        if(matches.length) await saveMatches(db,matches,matchCount);
        matchCount+=matches.length;
        self.postMessage({completed,unique,skipped,sum,min,max,matchCount,done:trial===trials});matches=[];last=performance.now();
      }
    }
  } catch(error) {self.postMessage({completed,unique,skipped,sum,min,max,matchCount,error:error instanceof Error?error.message:'Simulation failed.'})} finally {db?.close()}
};
