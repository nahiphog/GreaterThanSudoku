import { decodeCompactPuzzle } from './compact';
import { checkUniqueness } from './uniqueness';
import { ratePuzzle } from './difficulty';
self.onmessage = (event: MessageEvent<{string:string}>) => {
  try {
    const {jigs,size,string}=decodeCompactPuzzle(event.data.string);
    const result=checkUniqueness(jigs, message => self.postMessage({type:'progress',message}), size);
    self.postMessage({type:'verified',count:result.count,solution:result.count===1?result.solutions[0]:undefined,logicSteps:result.logicSteps,usedBacktracking:result.usedBacktracking,size,string});
    if(result.count===1) self.postMessage({type:'rating',...ratePuzzle(jigs,size)});
  } catch(error) {self.postMessage({type:'error',message:error instanceof Error?error.message:'Verification failed.'})}
};
