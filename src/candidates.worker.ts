import { jigCandidates } from './candidates';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<{jigs:Jig[];size:number}>) => {
  try {
    self.postMessage({ candidates: jigCandidates(event.data.jigs,event.data.size) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Unable to calculate notes.' });
  }
};
