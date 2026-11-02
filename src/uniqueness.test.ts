import test from 'node:test';
import assert from 'node:assert/strict';
import { checkUniqueness } from './uniqueness';
import { createJigs } from './sudoku';

test('exhaustive backtracking proves a 108-jig fixture unique', () => {
  const grid = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => (r * 3 + Math.floor(r / 3) + c) % 9 + 1));
  const jigs = createJigs(grid);
  assert.equal(jigs.length, 108);
  const result = checkUniqueness(jigs);
  assert.equal(result.count, 1);
  assert.deepEqual(result.solutions, [grid.flat()]);
});

test('empty jig puzzle stops at two distinct valid solutions', () => {
  const result = checkUniqueness([]);
  assert.equal(result.count, 2);
  assert.notDeepEqual(result.solutions[0], result.solutions[1]);
  for (const grid of result.solutions) {
    for (let i = 0; i < 9; i++) {
      assert.equal(new Set(grid.slice(i * 9, i * 9 + 9)).size, 9);
      assert.equal(new Set(Array.from({ length: 9 }, (_, r) => grid[r * 9 + i])).size, 9);
      assert.equal(new Set(Array.from({ length: 9 }, (_, k) => grid[(Math.floor(i / 3) * 3 + Math.floor(k / 3)) * 9 + i % 3 * 3 + k % 3])).size, 9);
    }
  }
});

test('contradictory comparisons have no solution', () => {
  assert.equal(checkUniqueness([
    { row: 0, col: 0, direction: 'horizontal', symbol: '<' },
    { row: 0, col: 0, direction: 'horizontal', symbol: '>' },
  ]).count, 0);
});
