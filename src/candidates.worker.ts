import { plausibleCandidates } from './candidates';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<Jig[]>) => {
  try {
    self.postMessage({ candidates: plausibleCandidates(event.data) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Unable to calculate notes.' });
  }
};
