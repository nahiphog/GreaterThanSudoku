import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCompactPuzzle } from './compact';
import { createJigs, generateSolution } from './sudoku';

test('sparse edges use the sister project ordering and zero placeholders', () => {
  const expected = Array<string>(144).fill('0');
  expected[0] = '<';
  expected[15] = '>';
  expected[71] = '<';
  expected[72] = '^';
  expected[82] = 'v';
  expected[143] = '^';
  assert.equal(encodeCompactPuzzle([
    { row: 0, col: 0, direction: 'horizontal', symbol: '<' },
    { row: 1, col: 7, direction: 'horizontal', symbol: '>' },
    { row: 8, col: 7, direction: 'horizontal', symbol: '<' },
    { row: 0, col: 0, direction: 'vertical', symbol: '^' },
    { row: 2, col: 1, direction: 'vertical', symbol: 'v' },
    { row: 7, col: 8, direction: 'vertical', symbol: '^' },
  ]), expected.join(''));
  assert.equal(encodeCompactPuzzle([]), '0'.repeat(144));
});

test('generated puzzle encodes every comparison and exactly 36 missing box-boundary jigs', () => {
  const grid = generateSolution();
  const text = encodeCompactPuzzle(createJigs(grid));
  assert.equal(text.length, 144);
  assert.equal([...text].filter(c => c === '0').length, 36);
  for (let row = 0; row < 9; row++) for (let col = 0; col < 8; col++) {
    assert.equal(text[row * 8 + col], col % 3 === 2 ? '0' : grid[row][col] < grid[row][col + 1] ? '<' : '>');
  }
  for (let col = 0; col < 9; col++) for (let row = 0; row < 8; row++) {
    assert.equal(text[72 + col * 8 + row], row % 3 === 2 ? '0' : grid[row][col] < grid[row + 1][col] ? '^' : 'v');
  }
});
