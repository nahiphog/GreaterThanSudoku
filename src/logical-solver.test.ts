import test from 'node:test';
import assert from 'node:assert/strict';
import { solveWithSteps, LOGIC_ORDER, type SolveFrame } from './logical-solver';
import { jigCandidates, plausibleCandidates } from './candidates';
import { createJigs } from './sudoku';
import { TECHS } from './techniques';

function verify(text: string) {
  const values = [...text].map(Number);
  const grid = Array.from({ length: 9 }, (_, row) => values.slice(row * 9, row * 9 + 9));
  const jigs = createJigs(grid);
  const fullSupport = plausibleCandidates(jigs);
  const frames: SolveFrame[] = [];
  const result = solveWithSteps(jigs, frame => {
    frames.push(frame);
    if (frame.kind !== 'backtracking') frame.values.forEach((v, cell) => {
      if (v) assert.deepEqual(fullSupport[cell], [v], `${frame.title} placed a digit that is not forced at ${cell}`);
      else assert.ok(fullSupport[cell].every(d => frame.candidates[cell].includes(d)), `${frame.title} removed a valid solution digit at ${cell}`);
    });
  });
  assert.deepEqual(frames[0].candidates, jigCandidates(jigs));
  assert.ok(frames[0].values.every(v => v === 0));
  const last = frames.at(-1)!.values;
  for (let i = 0; i < 9; i++) {
    assert.equal(new Set(last.slice(i * 9, i * 9 + 9)).size, 9);
    assert.equal(new Set(last.filter((_, c) => c % 9 === i)).size, 9);
    assert.equal(new Set(Array.from({ length: 9 }, (_, c) => last[(Math.floor(i / 3) * 3 + Math.floor(c / 3)) * 9 + i % 3 * 3 + c % 3])).size, 9);
  }
  assert.ok(last.every(v => v >= 1 && v <= 9));
  for (const j of jigs) {
    const a = last[j.row * 9 + j.col], b = last[j.row * 9 + j.col + (j.direction === 'horizontal' ? 1 : 9)];
    assert.ok(j.symbol === '<' || j.symbol === '∧' ? a < b : a > b);
  }
  assert.equal(frames.filter(f => f.kind === 'backtracking').length, Number(result.usedBacktracking));
  if (result.usedBacktracking) assert.equal(frames.at(-1)!.kind, 'backtracking');
  return { result, frames };
}

test('uses imported logical deductions from local notes and validates the final jigs', () => {
  const { result, frames } = verify('123456789456789123789123456234567891567891234891234567345678912678912345912345678');
  assert.equal(result.usedBacktracking, false);
  assert.ok(frames.some(f => f.title === 'Naked Single' || f.title === 'Hidden Single'));
  assert.ok(LOGIC_ORDER.every(t => TECHS[t].category !== 'Uniqueness' && t !== 'BRUTE_FORCE'));
});

test('multiple-solution fixture uses a labelled fallback only after logical steps', () => {
  const { result, frames } = verify('536974182791682543284135769869541327452367918173298456615723894947816235328459671');
  assert.ok(result.logicSteps > 0);
  assert.equal(result.usedBacktracking, true);
  assert.match(frames.at(-1)!.description, /other completions may exist/);
});
