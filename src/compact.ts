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

/** Parse the shared horizontal-row / vertical-column edge format. */
export function decodeCompactPuzzle(input: string): { jigs: Jig[]; size: number; string: string } {
  const string = input.replace(/\s/g, '').replace(/\^/g, '∧');
  const size = string.length === 60 ? 6 : string.length === 144 ? 9 : 0;
  if (!size) throw new Error('Enter 60 characters for a 6×6 puzzle or 144 characters for a 9×9 puzzle (spaces and line breaks are ignored).');
  const half = size * (size - 1);
  if (!/^[<>0]+$/.test(string.slice(0, half))) throw new Error('The first half contains horizontal jigs: use only <, >, or 0.');
  if (!/^[∧v0]+$/.test(string.slice(half))) throw new Error('The second half contains vertical jigs: use only ∧, v, or 0. The legacy ^ symbol is also accepted.');
  const jigs: Jig[] = [];
  let index = 0;
  for (let row = 0; row < size; row++) for (let col = 0; col < size - 1; col++) {
    const symbol = string[index++] as '<' | '>' | '0';
    if (symbol !== '0') jigs.push({ row, col, direction: 'horizontal', symbol });
  }
  for (let col = 0; col < size; col++) for (let row = 0; row < size - 1; row++) {
    const symbol = string[index++] as '∧' | 'v' | '0';
    if (symbol !== '0') jigs.push({ row, col, direction: 'vertical', symbol });
  }
  return { jigs, size, string };
}
