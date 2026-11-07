import { solveSix, searchDomains } from './six-solver';
import type { Jig } from './sudoku';
import { solveWithSteps, type SolveFrame } from './logical-solver';

export type UniquenessResult = { count: 0 | 1 | 2; solutions: number[][]; logicSteps: number; usedBacktracking: boolean };

/** Apply solution-preserving deductions first, then exhaust the remaining
 * possibilities (or stop at two witnesses). Never assume uniqueness.
 */
export function checkUniqueness(jigs: Jig[], progress: (message: string) => void = () => {}, size = 9): UniquenessResult {
  if (size === 6) {
    let last: SolveFrame | undefined;
    const logic = solveSix(jigs, frame => { last = frame; }, false);
    if (!last) throw new Error("Missing logical state");
    if (last.values.every(Boolean)) return { count: 1, solutions: [last.values], logicSteps: logic.logicSteps, usedBacktracking: false };
    progress(`After ${logic.logicSteps} logical steps, searching the remaining possibilities…`);
    const found = searchDomains(jigs, size, last.candidates.map((d,c) => last!.values[c] ? [last!.values[c]] : d), 2);
    return { count: found.solutions.length as 0|1|2, solutions: found.solutions, logicSteps: logic.logicSteps, usedBacktracking: true };
  }
  let frame: SolveFrame | undefined;
  let logicSteps = 0;
  try {
    const result = solveWithSteps(jigs, next => { frame = next; }, progress, false);
    logicSteps = result.logicSteps;
  } catch (error) {
    if (error instanceof Error && ['The jigs contain a contradictory cycle.', 'The local notes contradict the puzzle rules.'].includes(error.message)) {
      return { count: 0, solutions: [], logicSteps, usedBacktracking: false };
    }
    throw error;
  }
  if (!frame) throw new Error('No logical state was produced.');
  const values = [...frame.values];
  if (values.every(Boolean)) return { count: 1, solutions: [values], logicSteps, usedBacktracking: false };
  const candidates = frame.candidates;
  progress(`After ${logicSteps} logical steps, deductions stalled. Searching remaining possibilities to determine uniqueness…`);
  const rows = Array<number>(9).fill(0);
  const cols = Array<number>(9).fill(0);
  const boxes = Array<number>(9).fill(0);
  values.forEach((digit, cell) => {
    if (!digit) return;
    const row = Math.floor(cell / 9), col = cell % 9;
    rows[row] |= 1 << digit; cols[col] |= 1 << digit;
    boxes[Math.floor(row / 3) * 3 + Math.floor(col / 3)] |= 1 << digit;
  });
  const neighbors: { cell: number; smaller: boolean }[][] = Array.from({ length: 81 }, () => []);
  for (const jig of jigs) {
    const a = jig.row * 9 + jig.col;
    const b = a + (jig.direction === 'horizontal' ? 1 : 9);
    const smaller = jig.symbol === '<' || jig.symbol === '∧';
    neighbors[a].push({ cell: b, smaller });
    neighbors[b].push({ cell: a, smaller: !smaller });
  }
  const solutions: number[][] = [];
  function visit(): void {
    let chosen = -1;
    let options: number[] = [];
    // Keep every logical elimination and placement when searching the remainder.
    for (let cell = 0; cell < 81; cell++) {
      if (values[cell]) continue;
      const row = Math.floor(cell / 9), col = cell % 9;
      const used = rows[row] | cols[col] | boxes[Math.floor(row / 3) * 3 + Math.floor(col / 3)];
      const legal: number[] = [];
      for (const digit of candidates[cell]) {
        if (used & (1 << digit)) continue;
        if (neighbors[cell].some(edge => values[edge.cell] && (edge.smaller ? digit >= values[edge.cell] : digit <= values[edge.cell]))) continue;
        legal.push(digit);
      }
      if (!legal.length) return;
      if (chosen < 0 || legal.length < options.length) { chosen = cell; options = legal; }
    }
    if (chosen < 0) { solutions.push([...values]); return; }
    const row = Math.floor(chosen / 9), col = chosen % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    for (const digit of options) {
      const bit = 1 << digit;
      values[chosen] = digit;
      rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit;
      visit();
      values[chosen] = 0;
      rows[row] &= ~bit; cols[col] &= ~bit; boxes[box] &= ~bit;
      if (solutions.length >= 2) return;
    }
  }
  visit();
  return { count: solutions.length as 0 | 1 | 2, solutions, logicSteps, usedBacktracking: true };
}
