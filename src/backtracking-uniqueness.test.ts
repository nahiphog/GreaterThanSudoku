import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBacktrackingUniqueness } from './backtracking-uniqueness';
import { createJigs } from './sudoku';
import { checkUniqueness } from './uniqueness';
import { unitsFor, edgesFor } from './six-solver';

for (const size of [6, 9]) {
  test(`backtracking alone proves a ${size}x${size} fixture unique`, () => {
    const grid = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => (r * (size / 3) + Math.floor(r / 3) + c) % size + 1));
    const result = checkBacktrackingUniqueness(createJigs(grid), size);
    assert.equal(result.count, 1);
    assert.deepEqual(result.solutions, [grid.flat()]);
  });
  test(`empty ${size}x${size} puzzle returns two distinct valid completions`, () => {
    const result = checkBacktrackingUniqueness([], size);
    assert.equal(result.count, 2);
    assert.notDeepEqual(result.solutions[0], result.solutions[1]);
    for (const solution of result.solutions) for (const unit of unitsFor(size)) assert.equal(new Set(unit.map(c => solution[c])).size, size);
  });
  test(`contradictory ${size}x${size} comparisons have no solution`, () => {
    assert.equal(checkBacktrackingUniqueness([
      { row: 0, col: 0, direction: 'horizontal', symbol: '<' },
      { row: 0, col: 0, direction: 'horizontal', symbol: '>' },
    ], size).count, 0);
  });
}
test('backtracking-only check agrees with logical checker on a non-unique jig fixture', () => {
  const values = [...'536974182791682543284135769869541327452367918173298456615723894947816235328459671'].map(Number);
  const jigs = createJigs(Array.from({ length: 9 }, (_, r) => values.slice(r * 9, r * 9 + 9)));
  const result = checkBacktrackingUniqueness(jigs);
  assert.equal(result.count, 2);
  assert.equal(result.count, checkUniqueness(jigs).count);
  for (const solution of result.solutions) {
    for (const unit of unitsFor(9)) assert.equal(new Set(unit.map(c => solution[c])).size, 9);
    for (const [a, b] of edgesFor(jigs, 9)) assert.ok(solution[a] < solution[b]);
  }
});
