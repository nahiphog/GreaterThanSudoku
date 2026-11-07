import type { Jig } from './sudoku';

/** EitherOrSudoku ordering: horizontal edges by row, then vertical edges by column. */
export function encodeCompactPuzzle(jigs: Jig[], size = 9): string {
  const symbols = new Map(jigs.map(jig => [`${jig.direction}:${jig.row}:${jig.col}`, jig.symbol]));
  let result = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size - 1; col++) result += symbols.get(`horizontal:${row}:${col}`) ?? '0';
  }
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size - 1; row++) result += symbols.get(`vertical:${row}:${col}`) ?? '0';
  }
  return result;
}
