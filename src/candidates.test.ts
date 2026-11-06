import test from 'node:test';
import assert from 'node:assert/strict';
import { jigCandidates, plausibleCandidates } from './candidates';
import { createJigs, generateSolution, type Jig } from './sudoku';

test('local notes for the supplied puzzle retain R2C3 values 1–4', () => {
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
  const notes = jigCandidates(jigs);
  assert.equal(notes.length, 81);
  // Box ordering alone permits 1–4; full Sudoku consistency leaves only 3.
  assert.deepEqual(notes[11], [1, 2, 3, 4]);
  assert.deepEqual(plausibleCandidates(jigs)[11], [3]);
});

test('full-puzzle candidate checking preserves known solutions and unrestricted digits', () => {
  for (let i = 0; i < 10; i++) {
    const grid = generateSolution();
    const notes = plausibleCandidates(createJigs(grid));
    notes.forEach((values, cell) => assert.ok(values.includes(grid[Math.floor(cell / 9)][cell % 9])));
  }
  assert.ok(plausibleCandidates([]).every(values => values.join('') === '123456789'));
});

test('local notes retain the known solution in all 81 cells over 1000 generated puzzles', () => {
  for (let i = 0; i < 1000; i++) {
    const grid = generateSolution();
    jigCandidates(createJigs(grid)).forEach((notes, cell) => {
      assert.ok(notes.includes(grid[Math.floor(cell / 9)][cell % 9]));
    });
  }
  assert.deepEqual(jigCandidates([])[0], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('branching local deductions count distinct cells without double-counting shared paths', () => {
  const jigs: Jig[] = [
    { row: 0, col: 0, direction: 'horizontal', symbol: '<' },
    { row: 0, col: 0, direction: 'vertical', symbol: '∧' },
    { row: 0, col: 1, direction: 'vertical', symbol: '∧' },
    { row: 1, col: 0, direction: 'horizontal', symbol: '<' },
  ];
  const notes = jigCandidates(jigs);
  assert.deepEqual(notes[0], [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(notes[10], [4, 5, 6, 7, 8, 9]);
  const otherBox: Jig = { row: 0, col: 3, direction: 'horizontal', symbol: '<' };
  const changed = jigCandidates([...jigs, otherBox]);
  for (const cell of [0, 1, 2, 9, 10, 11, 18, 19, 20]) assert.deepEqual(changed[cell], notes[cell]);
});
