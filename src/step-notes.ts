import type { SolveFrame } from './logical-solver';

/** Visual-only overlay: solver state stays fully eliminated after each deduction. */
export function stepNotes(frame: SolveFrame, previous: SolveFrame | undefined, cell: number) {
  const value = frame.values[cell];
  const remaining = value ? [value] : frame.candidates[cell];
  const before = previous?.values[cell] ? [] : previous?.candidates[cell] ?? [];
  const removed = [...new Set([
    ...before.filter(d => !remaining.includes(d)),
    ...frame.eliminations.filter(e => e.cell === cell).map(e => e.digit),
  ])];
  return { remaining, removed, showNotes: !value || removed.length > 0 };
}
