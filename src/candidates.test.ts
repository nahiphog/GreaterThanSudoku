import test from 'node:test';
import assert from 'node:assert/strict';
import { jigCandidates, plausibleCandidates } from './candidates';
import { createJigs, generateSolution, type Jig } from './sudoku';

test('the full supplied puzzle narrows R2C3 to 3', () => {
  const text = '<>0<>0<<>>0><0><><0<<0><><0>>0><>>0>>0>><<0>>0>><>0><0<>><0<<0<><>0<>0><∧v0v∧0∧vvv0v∧0v∧v∧0v∧0∧v∧v0vv0v∧v∧0vv0v∧vv0∧v0∧v∧∧0∧v0v∧v∧0∧v0vv∧∧0∧v0∧∧';
  assert.equal(text.length, 144);
  const jigs: Jig[] = [];
  for (let i = 0; i < 144; i++) {
    const symbol = text[i];
    if (symbol === '0') continue;
    jigs.push(i < 72
      ? { row: Math.floor(i / 8), col: i % 8, direction: 'horizontal', symbol: symbol as Jig['symbol'] }
      : { row: (i - 72) % 8, col: Math.floor((i - 72) / 8), direction: 'vertical', symbol: symbol as Jig['symbol'] });
  }
  const notes = plausibleCandidates(jigs);
  assert.equal(notes.length, 81);
  // Box ordering alone permits 1–4; full Sudoku consistency leaves only 3.
  assert.deepEqual(jigCandidates(jigs)[11], [1, 2, 3, 4]);
  assert.deepEqual(notes[11], [3]);
});

test('full-puzzle candidate checking preserves known solutions and unrestricted digits', () => {
  for (let i = 0; i < 10; i++) {
    const grid = generateSolution();
    const notes = plausibleCandidates(createJigs(grid));
    notes.forEach((values, cell) => assert.ok(values.includes(grid[Math.floor(cell / 9)][cell % 9])));
  }
  assert.ok(plausibleCandidates([]).every(values => values.join('') === '123456789'));
});

test('notes retain the known solution in every cell over 100 generated puzzles', () => {
  for (let i = 0; i < 100; i++) {
    const grid = generateSolution();
    jigCandidates(createJigs(grid)).forEach((notes, cell) => {
      assert.ok(notes.includes(grid[Math.floor(cell / 9)][cell % 9]));
    });
  }
  assert.deepEqual(jigCandidates([])[0], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
