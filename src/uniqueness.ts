import type { Jig } from './sudoku';

export type UniquenessResult = { count: 0 | 1 | 2; solutions: number[][] };

/** Independent backtracking from 81 empty cells. No notes, solution, or logical
 * technique inputs. Two witnesses suffice to prove non-uniqueness.
 */
export function checkUniqueness(jigs: Jig[]): UniquenessResult {
  const values = Array<number>(81).fill(0);
  const rows = Array<number>(9).fill(0);
  const cols = Array<number>(9).fill(0);
  const boxes = Array<number>(9).fill(0);
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
    // Choose the empty cell with fewest currently legal trials. These are
    // recomputed directly from assigned values, never from Snyder notes.
    for (let cell = 0; cell < 81; cell++) {
      if (values[cell]) continue;
      const row = Math.floor(cell / 9), col = cell % 9;
      const used = rows[row] | cols[col] | boxes[Math.floor(row / 3) * 3 + Math.floor(col / 3)];
      const legal: number[] = [];
      for (let digit = 1; digit <= 9; digit++) {
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
  return { count: solutions.length as 0 | 1 | 2, solutions };
}
