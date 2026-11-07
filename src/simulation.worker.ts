import { openMatches, saveMatches } from './simulation-store';
import { generateSolution, createJigs } from './sudoku';
import { encodeCompactPuzzle } from './compact';
import { ratePuzzle, type Tally } from './difficulty';
export type Match = { trial:number; score:number; string:string; tally:Tally[] };
self.onmessage=async event=>{
  const {trials,size,threshold,database}=event.data;
  let completed=0,sum=0,min=Infinity,max=0,last=performance.now();
  let matches: Match[]=[];
  const tally=new Map<string,Tally>();
  let db: IDBDatabase | undefined, matchCount=0;
  try {
    db=await openMatches(database);
    for(let trial=1;trial<=trials;trial++) {
      const jigs=createJigs(generateSolution(size)), rating=ratePuzzle(jigs,size);
      completed++;sum+=rating.score;min=Math.min(min,rating.score);max=Math.max(max,rating.score);
      for(const item of rating.tally) {const old=tally.get(item.name);if(old) old.count+=item.count;else tally.set(item.name,{...item})}
      if(rating.score>=threshold) matches.push({trial,score:rating.score,string:encodeCompactPuzzle(jigs,size),tally:rating.tally});
      if(performance.now()-last>150 || trial===trials) {
        if(matches.length) await saveMatches(db,matches,matchCount);
        matchCount+=matches.length;
        self.postMessage({completed,sum,min,max,matchCount,tally:[...tally.values()].sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name)),done:trial===trials});matches=[];last=performance.now();
      }
    }
  } catch(error) {self.postMessage({completed,sum,min,max,matchCount,error:error instanceof Error?error.message:'Simulation failed.'})} finally {db?.close()}
};
