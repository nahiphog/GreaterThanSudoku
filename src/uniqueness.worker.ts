import { checkUniqueness } from './uniqueness';
import type { Jig } from './sudoku';

self.onmessage = (event: MessageEvent<Jig[]>) => {
  try {
    self.postMessage({ count: checkUniqueness(event.data).count });
  } catch {
    self.postMessage({ error: 'The uniqueness check failed. Please try again.' });
  }
};
