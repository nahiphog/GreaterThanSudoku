import { ratePuzzle } from './difficulty';
self.onmessage=event=>{
  try { self.postMessage(ratePuzzle(event.data.jigs,event.data.size)); }
  catch(error) { self.postMessage({error:error instanceof Error?error.message:'Rating failed.'}); }
};
