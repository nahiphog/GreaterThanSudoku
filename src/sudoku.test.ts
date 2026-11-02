import test from 'node:test';
import assert from 'node:assert/strict';
import { createJigs, generateSolution } from './sudoku.ts';

test('100 generated solutions satisfy every Sudoku unit and all 108 jig comparisons', () => {
  const solutions = new Set<string>();
  const validUnit = (unit: number[]) => assert.deepEqual([...unit].sort(), [1,2,3,4,5,6,7,8,9]);
  for (let sample = 0; sample < 100; sample++) {
    const grid = generateSolution();
    solutions.add(JSON.stringify(grid));
    grid.forEach(validUnit);
    for (let col = 0; col < 9; col++) validUnit(grid.map(row => row[col]));
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      validUnit(grid.slice(br * 3, br * 3 + 3).flatMap(row => row.slice(bc * 3, bc * 3 + 3)));
    }
    const jigs = createJigs(grid);
    assert.equal(jigs.length, 108);
    assert.equal(jigs.filter(j => j.direction === 'horizontal').length, 54);
    const counts = Array(9).fill(0);
    for (const jig of jigs) {
      const { row, col, direction, symbol } = jig;
      counts[Math.floor(row / 3) * 3 + Math.floor(col / 3)]++;
      if (direction === 'horizontal') {
        assert.notEqual(col % 3, 2);
        assert.equal(symbol, grid[row][col] < grid[row][col + 1] ? '<' : '>');
      } else {
        assert.notEqual(row % 3, 2);
        assert.equal(symbol, grid[row][col] < grid[row + 1][col] ? '∧' : 'v');
      }
    }
    assert.deepEqual(counts, Array(9).fill(12));
  }
  assert.equal(solutions.size, 100);
});

test('the supplied example points upward from 8 toward 7 and rightward from 8 toward 9', () => {
  const grid = generateSolution();
  grid[1][0] = 7;
  grid[2][0] = 8;
  grid[2][1] = 9;
  const jigs = createJigs(grid);
  assert.equal(jigs.find(j => j.row === 1 && j.col === 0 && j.direction === 'vertical')?.symbol, '∧');
  assert.equal(jigs.find(j => j.row === 2 && j.col === 0 && j.direction === 'horizontal')?.symbol, '<');
});
