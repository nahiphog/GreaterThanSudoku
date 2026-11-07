import { checkUniqueness } from './uniqueness';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<{jigs:Jig[];size:number}>) => {
  try {
    const result = checkUniqueness(event.data.jigs, progress => self.postMessage({ progress }), event.data.size);
    self.postMessage({ count: result.count, logicSteps: result.logicSteps, usedBacktracking: result.usedBacktracking });
  } catch {
    self.postMessage({ error: 'The uniqueness check failed. Please try again.' });
  }
};
