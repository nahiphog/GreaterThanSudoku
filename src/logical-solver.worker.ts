import { solveWithSteps } from './logical-solver';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<Jig[]>) => {
  try {
    const result = solveWithSteps(event.data, frame => self.postMessage({ type: 'step', frame }), message => self.postMessage({ type: 'progress', message }));
    self.postMessage({ type: 'done', ...result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unable to solve this puzzle.' });
  }
};
