export type Grid = number[][];
export type Jig = { row: number; col: number; direction: 'horizontal' | 'vertical'; symbol: '<' | '>' | '^' | 'v' };

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Randomized backtracking produces a full valid Sudoku. */
export function generateSolution(): Grid {
  const grid: Grid = Array.from({ length: 9 }, () => Array<number>(9).fill(0));
  const rows = Array<number>(9).fill(0);
  const cols = Array<number>(9).fill(0);
  const boxes = Array<number>(9).fill(0);
  function fill(index: number): boolean {
    if (index === 81) return true;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    for (const value of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      const bit = 1 << value;
      if ((rows[row] | cols[col] | boxes[box]) & bit) continue;
      grid[row][col] = value;
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;
      if (fill(index + 1)) return true;
      rows[row] &= ~bit;
      cols[col] &= ~bit;
      boxes[box] &= ~bit;
      grid[row][col] = 0;
    }
    return false;
  }
  fill(0);
  return grid;
}

/** Six horizontal and six vertical comparisons per box: 108 total. */
export function createJigs(grid: Grid): Jig[] {
  const jigs: Jig[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (col % 3 !== 2) jigs.push({ row, col, direction: 'horizontal', symbol: grid[row][col] < grid[row][col + 1] ? '<' : '>' });
      if (row % 3 !== 2) jigs.push({ row, col, direction: 'vertical', symbol: grid[row][col] < grid[row + 1][col] ? '^' : 'v' });
    }
  }
  return jigs;
}
