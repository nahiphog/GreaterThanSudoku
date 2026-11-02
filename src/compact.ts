import type { Jig } from './sudoku';

/** EitherOrSudoku ordering: 72 horizontal edges by row, then 72 vertical edges by column. */
export function encodeCompactPuzzle(jigs: Jig[]): string {
  const symbols = new Map(jigs.map(jig => [`${jig.direction}:${jig.row}:${jig.col}`, jig.symbol]));
  let result = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 8; col++) result += symbols.get(`horizontal:${row}:${col}`) ?? '0';
  }
  for (let col = 0; col < 9; col++) {
    for (let row = 0; row < 8; row++) result += symbols.get(`vertical:${row}:${col}`) ?? '0';
  }
  return result;
}
