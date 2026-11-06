import { checkUniqueness } from './uniqueness';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<Jig[]>) => {
  try {
    const result = checkUniqueness(event.data, progress => self.postMessage({ progress }));
    self.postMessage({ count: result.count, logicSteps: result.logicSteps, usedBacktracking: result.usedBacktracking });
  } catch {
    self.postMessage({ error: 'The uniqueness check failed. Please try again.' });
  }
};
