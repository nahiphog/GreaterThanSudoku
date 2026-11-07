export type Grid = number[][];
export type Jig = { row: number; col: number; direction: 'horizontal' | 'vertical'; symbol: '<' | '>' | '∧' | 'v' };

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Randomized backtracking produces a full valid Sudoku. */
export function generateSolution(size = 9): Grid {
  const grid: Grid = Array.from({ length: size }, () => Array<number>(size).fill(0));
  const rows = Array<number>(size).fill(0);
  const cols = Array<number>(size).fill(0);
  const boxes = Array<number>(size).fill(0);
  function fill(index: number): boolean {
    if (index === size * size) return true;
    const row = Math.floor(index / size);
    const col = index % size;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / (size / 3));
    for (const value of shuffle(Array.from({ length: size }, (_, i) => i + 1))) {
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

/** Comparisons stay within regions: 108 on 9x9, or 42 on 6x6. */
export function createJigs(grid: Grid): Jig[] {
  const jigs: Jig[] = [];
  const size = grid.length, width = size / 3;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (col % width !== width - 1) jigs.push({ row, col, direction: 'horizontal', symbol: grid[row][col] < grid[row][col + 1] ? '<' : '>' });
      if (row % 3 !== 2) jigs.push({ row, col, direction: 'vertical', symbol: grid[row][col] < grid[row + 1][col] ? '∧' : 'v' });
    }
  }
  return jigs;
}
