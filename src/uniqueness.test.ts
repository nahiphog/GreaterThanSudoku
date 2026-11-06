import test from 'node:test';
import assert from 'node:assert/strict';
import { checkUniqueness } from './uniqueness';
import { createJigs } from './sudoku';

test('local notes and imported techniques prove a 108-jig fixture unique without search', () => {
  const grid = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => (r * 3 + Math.floor(r / 3) + c) % 9 + 1));
  const jigs = createJigs(grid);
  assert.equal(jigs.length, 108);
  const result = checkUniqueness(jigs);
  assert.equal(result.count, 1);
  assert.equal(result.usedBacktracking, false);
  assert.ok(result.logicSteps > 0);
  assert.deepEqual(result.solutions, [grid.flat()]);
});

test('empty jig puzzle stops at two distinct valid solutions', () => {
  const result = checkUniqueness([]);
  assert.equal(result.count, 2);
  assert.equal(result.usedBacktracking, true);
  assert.notDeepEqual(result.solutions[0], result.solutions[1]);
  for (const grid of result.solutions) {
    for (let i = 0; i < 9; i++) {
      assert.equal(new Set(grid.slice(i * 9, i * 9 + 9)).size, 9);
      assert.equal(new Set(Array.from({ length: 9 }, (_, r) => grid[r * 9 + i])).size, 9);
      assert.equal(new Set(Array.from({ length: 9 }, (_, k) => grid[(Math.floor(i / 3) * 3 + Math.floor(k / 3)) * 9 + i % 3 * 3 + k % 3])).size, 9);
    }
  }
});

test('logical deductions preserve multiple solutions before last-resort search', () => {
  const values = [...'536974182791682543284135769869541327452367918173298456615723894947816235328459671'].map(Number);
  const jigs = createJigs(Array.from({ length: 9 }, (_, r) => values.slice(r * 9, r * 9 + 9)));
  const progress: string[] = [];
  const result = checkUniqueness(jigs, message => progress.push(message));
  assert.equal(result.count, 2);
  assert.ok(result.logicSteps > 0);
  assert.equal(result.usedBacktracking, true);
  assert.match(progress.at(-1)!, /deductions stalled/);
  assert.notDeepEqual(result.solutions[0], result.solutions[1]);
  for (const solution of result.solutions) {
    for (let i = 0; i < 9; i++) {
      assert.equal(new Set(solution.slice(i * 9, i * 9 + 9)).size, 9);
      assert.equal(new Set(solution.filter((_, c) => c % 9 === i)).size, 9);
      assert.equal(new Set(Array.from({ length: 9 }, (_, k) => solution[(Math.floor(i / 3) * 3 + Math.floor(k / 3)) * 9 + i % 3 * 3 + k % 3])).size, 9);
    }
    for (const j of jigs) {
      const a = solution[j.row * 9 + j.col], b = solution[j.row * 9 + j.col + (j.direction === 'horizontal' ? 1 : 9)];
      assert.ok(j.symbol === '<' || j.symbol === '∧' ? a < b : a > b);
    }
  }
});

test('contradictory comparisons have no solution', () => {
  assert.equal(checkUniqueness([
    { row: 0, col: 0, direction: 'horizontal', symbol: '<' },
    { row: 0, col: 0, direction: 'horizontal', symbol: '>' },
  ]).count, 0);
});
