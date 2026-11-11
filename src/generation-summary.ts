import type { Tally } from './difficulty';

/** Rank techniques by per-use difficulty, not accumulated subtotal. */
export function hardestTechnique(tally:Tally[]):string {
  const used=tally.filter(entry=>entry.count>0);
  if(!used.length)return 'None';
  const maximum=Math.max(...used.map(entry=>entry.score));
  return used.filter(entry=>entry.score===maximum).map(entry=>entry.name).join(', ');
}
