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
    let logic;
    try {
      logic = solveSix(jigs, frame => { last = frame; }, false);
    } catch (error) {
      if (error instanceof Error && ['The jigs contain a contradictory cycle.', 'Contradictory candidates.'].includes(error.message)) {
        return { count: 0, solutions: [], logicSteps: 0, usedBacktracking: false };
      }
      throw error;
    }
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
    if (error instanceof Error && ['The jigs contain a contradictory cycle.', 'The local notes contradict the puzzle rules.', 'Phistomefel Ring counts contradict the puzzle rules.'].includes(error.message)) {
      return { count: 0, solutions: [], logicSteps, usedBacktracking: false };
    }
    throw error;
  }
  if (!frame) throw new Error('No logical state was produced.');
  const values = [...frame.values];
  if (values.every(Boolean)) return { count: 1, solutions: [values], logicSteps, usedBacktracking: false };
  const candidates = frame.candidates;
  progress(`After ${logicSteps} logical steps, deductions stalled. Searching remaining possibilities to determine uniqueness…`);
  const found=searchDomains(jigs,9,candidates.map((ds,c)=>values[c]?[values[c]]:ds),2);
  return {count:found.solutions.length as 0|1|2,solutions:found.solutions,logicSteps,usedBacktracking:true};
}
