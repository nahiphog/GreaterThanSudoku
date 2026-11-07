import type { Jig } from './sudoku';

/** Search from an empty grid using assigned values only. No notes, propagation,
 * logical techniques, generated solution, or walkthrough state are inputs. */
export function checkBacktrackingUniqueness(jigs: Jig[], size = 9) {
  if (size !== 6 && size !== 9) throw new Error('Unsupported grid size.');
  const values = Array<number>(size * size).fill(0);
  const rows = Array<number>(size).fill(0), cols = [...rows], boxes = [...rows];
  const neighbors: { cell: number; smaller: boolean }[][] = Array.from({ length: size * size }, () => []);
  const boxOf = (cell: number) => Math.floor(Math.floor(cell / size) / 3) * 3 + Math.floor(cell % size / (size / 3));
  for (const jig of jigs) {
    const a = jig.row * size + jig.col, b = a + (jig.direction === 'horizontal' ? 1 : size);
    const smaller = jig.symbol === '<' || jig.symbol === '∧';
    neighbors[a].push({ cell: b, smaller }); neighbors[b].push({ cell: a, smaller: !smaller });
  }
  const solutions: number[][] = [];
  function visit(): void {
    let chosen = -1, options: number[] = [];
    // MRV orders the search; it does not propagate or retain candidate notes.
    for (let cell = 0; cell < values.length; cell++) {
      if (values[cell]) continue;
      const used = rows[Math.floor(cell / size)] | cols[cell % size] | boxes[boxOf(cell)];
      const legal: number[] = [];
      for (let digit = 1; digit <= size; digit++) {
        if (used & (1 << digit)) continue;
        if (neighbors[cell].some(edge => values[edge.cell] && (edge.smaller ? digit >= values[edge.cell] : digit <= values[edge.cell]))) continue;
        legal.push(digit);
      }
      if (!legal.length) return;
      if (chosen < 0 || legal.length < options.length) { chosen = cell; options = legal; }
    }
    if (chosen < 0) { solutions.push([...values]); return; }
    const row = Math.floor(chosen / size), col = chosen % size, box = boxOf(chosen);
    for (const digit of options) {
      const mask = 1 << digit;
      values[chosen] = digit; rows[row] |= mask; cols[col] |= mask; boxes[box] |= mask;
      visit();
      values[chosen] = 0; rows[row] &= ~mask; cols[col] &= ~mask; boxes[box] &= ~mask;
      if (solutions.length === 2) return;
    }
  }
  visit();
  return { count: solutions.length as 0 | 1 | 2, solutions };
}
