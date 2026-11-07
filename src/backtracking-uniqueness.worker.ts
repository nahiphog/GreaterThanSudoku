import { checkBacktrackingUniqueness } from './backtracking-uniqueness';
import type { Jig } from './sudoku';
self.onmessage = (event: MessageEvent<{ jigs: Jig[]; size: number }>) => {
  try { self.postMessage({ count: checkBacktrackingUniqueness(event.data.jigs, event.data.size).count }); }
  catch { self.postMessage({ error: 'The backtracking-only check failed. Please try again.' }); }
};
