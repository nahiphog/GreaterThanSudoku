import { createDifficultyHistogram, recordDifficulty } from './difficulty-histogram';
import { createJigHistogram, recordJigCount } from './jig-histogram';
import { openMatches, saveMatches } from './simulation-store';
import { generateSolution } from './sudoku';
import type { Tally } from './difficulty';
import { analyzeSimulationTrial } from './simulation-trial';
export type Match = { trial:number; elapsedMs:number; solution:number[][]; jigCount:number; score?:number; string:string; tally?:Tally[] };
self.onmessage=async event=>{
  const {trials,size,threshold,database,mode='difficulty',dig=false,method='single'}=event.data;
  let completed=0,unique=0,skipped=0,sum=0,min=Infinity,max=0,last=performance.now();
  const difficultyHistogram=mode==='difficulty'?createDifficultyHistogram():undefined;
  const jigHistogram=mode==='jigs'?createJigHistogram(size):undefined;
  let matches: Match[]=[];
  let db: IDBDatabase | undefined, matchCount=0;
  try {
    db=await openMatches(database);
    for(let trial=1;trial<=trials;trial++) {
      const startedAt=performance.now();
      const solution=generateSolution(size), analysis=analyzeSimulationTrial(solution,mode,dig,threshold,method);
      completed++;
      if (analysis) {
        if(difficultyHistogram)recordDifficulty(difficultyHistogram,analysis.metric);
        if(jigHistogram)recordJigCount(jigHistogram,analysis.jigCount);
        unique++; sum+=analysis.metric;min=Math.min(min,analysis.metric);max=Math.max(max,analysis.metric);
        if(analysis.matches) matches.push({trial,elapsedMs:performance.now()-startedAt,solution,jigCount:analysis.jigCount,score:analysis.score,string:analysis.string,tally:analysis.tally});
      } else skipped++;
      if(analysis || performance.now()-last>150 || trial===trials) {
        if(matches.length) await saveMatches(db,matches,matchCount);
        matchCount+=matches.length;
        self.postMessage({difficultyHistogram,jigHistogram,completed,unique,skipped,sum,min,max,matchCount,done:trial===trials});matches=[];last=performance.now();
      }
    }
  } catch(error) {self.postMessage({difficultyHistogram,jigHistogram,completed,unique,skipped,sum,min,max,matchCount,error:error instanceof Error?error.message:'Simulation failed.'})} finally {db?.close()}
};
