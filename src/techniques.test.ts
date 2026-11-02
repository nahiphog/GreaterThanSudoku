import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStep, findNextStep, gridFromValues, TECHS } from './techniques';
import { generateSolution } from './sudoku';

test('imported sudokUI engine finds and applies a missing cell', () => {
  const values = generateSolution().flat();
  const expected = values[0];
  values[0] = 0;
  const grid = gridFromValues(values);
  const step = findNextStep(grid);
  assert.ok(step);
  assert.deepEqual(step.placements, [{ cell: 0, digit: expected }]);
  applyStep(grid, step);
  assert.equal(grid.values[0], expected);
  assert.ok(TECHS.X_WING);
  assert.ok(TECHS.NAKED_PAIR);
});
