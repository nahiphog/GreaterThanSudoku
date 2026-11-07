import { solveUniquePuzzle } from './difficulty';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<{jigs:Jig[];size:number}>) => {
  try {
    const result = solveUniquePuzzle(event.data.jigs, event.data.size, frame => self.postMessage({ type: 'step', frame }), message => self.postMessage({ type: 'progress', message }));
    if (!result) { self.postMessage({type:'error',message:'Walkthrough unavailable: the puzzle does not have a unique solution.'}); return; }
    self.postMessage({ type: 'done', ...result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unable to solve this puzzle.' });
  }
};
