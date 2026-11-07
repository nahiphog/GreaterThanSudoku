import { rateUniquePuzzle } from './difficulty';
self.onmessage=event=>{
  try {
    const result = rateUniquePuzzle(event.data.jigs,event.data.size);
    self.postMessage(result.rating ?? {error:'Difficulty is unavailable because the puzzle does not have a unique solution.'});
  } catch(error) { self.postMessage({error:error instanceof Error?error.message:'Rating failed.'}); }
};
