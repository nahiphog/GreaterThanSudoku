import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { plausibleCandidates, jigCandidates } from '../src/candidates';
import { createJigs, generateSolution, type Jig } from '../src/sudoku';
import { encodeCompactPuzzle } from '../src/compact';

// Independent oracle: enumerate topological orders of each box's nine cells,
// then join entire box permutations using only row/column disjointness.
// It never receives production notes or uses production search/propagation.
function oracle(jigs: Jig[]): number[][] {
  const cells = Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, i) =>
    (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + i % 3));
  const patterns = cells.map(box => {
    const before = Array<number>(9).fill(0);
    for (const j of jigs) {
      const a = box.indexOf(j.row * 9 + j.col);
      const b = box.indexOf(j.row * 9 + j.col + (j.direction === 'horizontal' ? 1 : 9));
      if (a < 0 || b < 0) continue;
      if (j.symbol === '<' || j.symbol === '∧') before[b] |= 1 << a;
      else before[a] |= 1 << b;
    }
    const out: { values: number[]; rows: number[]; cols: number[]; rowCode: number; colCode: number }[] = [];
    const values = Array<number>(9).fill(0);
    function order(placed: number, digit: number) {
      if (digit === 10) {
        const rows = [0, 0, 0], cols = [0, 0, 0];
        values.forEach((v, i) => { rows[Math.floor(i / 3)] |= 1 << v; cols[i % 3] |= 1 << v; });
        out.push({ values: [...values], rows, cols, rowCode: rows[0] | (rows[1] << 10) | (rows[2] << 20), colCode: cols[0] | (cols[1] << 10) | (cols[2] << 20) });
        return;
      }
      for (let i = 0; i < 9; i++) if (!(placed & (1 << i)) && (before[i] & placed) === before[i]) {
        values[i] = digit;
        order(placed | (1 << i), digit + 1);
      }
    }
    order(0, 1);
    return out;
  });
  const supported = Array.from({ length: 81 }, () => new Set<number>());
  function visit(domains: typeof patterns): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) {
        if (a === b) continue;
        const axis = Math.floor(a / 3) === Math.floor(b / 3) ? 'rowCode' : a % 3 === b % 3 ? 'colCode' : null;
        if (!axis) continue;
        const other = [...new Set(domains[b].map(p => p[axis]))];
        const cache = new Map<number, boolean>();
        const kept = domains[a].filter(p => {
          const key = p[axis];
          if (!cache.has(key)) cache.set(key, other.some(code => !(key & code)));
          return cache.get(key);
        });
        if (!kept.length) return;
        if (kept.length !== domains[a].length) { domains[a] = kept; changed = true; }
      }
    }
    let chosen = -1;
    for (let b = 0; b < 9; b++) if (domains[b].length > 1 && (chosen < 0 || domains[b].length < domains[chosen].length)) chosen = b;
    if (chosen < 0) {
      const result = Array<number>(81).fill(0);
      domains.forEach((p,b) => cells[b].forEach((cell,i) => { result[cell] = p[0].values[i]; }));
      for (let i = 0; i < 9; i++) {
        assert.equal(new Set(result.slice(i * 9, i * 9 + 9)).size, 9);
        assert.equal(new Set(result.filter((_, k) => k % 9 === i)).size, 9);
        assert.equal(new Set(cells[i].map(k => result[k])).size, 9);
      }
      for (const j of jigs) {
        const a = result[j.row * 9 + j.col];
        const b = result[j.row * 9 + j.col + (j.direction === 'horizontal' ? 1 : 9)];
        assert.ok(j.symbol === '<' || j.symbol === '∧' ? a < b : a > b);
      }
      result.forEach((v,i) => supported[i].add(v));
      return;
    }
    for (const p of domains[chosen]) {
      const next = [...domains]; next[chosen] = [p]; visit(next);
    }
  }
  visit(patterns);
  return supported.map(s => [...s].sort((a, b) => a - b));
}

const trials = Number(process.argv[2] ?? 1000);
const seed = 20261106;
let state = seed;
function random() {
  state += 0x6D2B79F5;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const previous = process.argv.includes('--resume') && existsSync('audit-results/notes-1000.json') ? JSON.parse(readFileSync('audit-results/notes-1000.json', 'utf8')) : null;
const started = Date.now() - (previous?.elapsedSeconds ?? 0) * 1000;
const results: unknown[] = previous?.results ?? [];
const totals = previous?.totals ?? { trials: 0, cellsChecked: 0, digitMembershipsChecked: 0, falseInclusions: 0, falseExclusions: 0, missingKnownSolution: 0, differsFromLocalBounds: 0, uniquePuzzles: 0, multipleSolutionPuzzles: 0, nonSnyderMarks: 0 };
mkdirSync('audit-results', { recursive: true });
for (let trial = 1; trial <= trials; trial++) {
  const savedRandom = Math.random;
  Math.random = random;
  let grid: number[][];
  try { grid = generateSolution(); } finally { Math.random = savedRandom; }
  if (trial <= (previous?.totals.trials ?? 0)) continue;
  const jigs = createJigs(grid);
  assert.equal(jigs.length, 108);
  const actual = plausibleCandidates(jigs);
  const expected = oracle(jigs);
  const local = jigCandidates(jigs);
  const mismatches: unknown[] = [];
  actual.forEach((notes, cell) => {
    totals.cellsChecked++;
    if (!notes.includes(grid[Math.floor(cell / 9)][cell % 9])) totals.missingKnownSolution++;
    if (notes.join() !== local[cell].join()) totals.differsFromLocalBounds++;
    for (let digit = 1; digit <= 9; digit++) {
      totals.digitMembershipsChecked++;
      if (notes.includes(digit) !== expected[cell].includes(digit)) {
        if (notes.includes(digit)) totals.falseInclusions++; else totals.falseExclusions++;
        mismatches.push({ cell, digit, actual: notes, expected: expected[cell] });
      }
    }
    const row = Math.floor(cell / 9), col = cell % 9;
    const box = Array.from({ length: 9 }, (_, i) => (Math.floor(row / 3) * 3 + Math.floor(i / 3)) * 9 + Math.floor(col / 3) * 3 + i % 3);
    for (const digit of notes) if (box.filter(c => actual[c].includes(digit)).length !== 2) totals.nonSnyderMarks++;
  });
  if (expected.every(v => v.length === 1)) totals.uniquePuzzles++; else totals.multipleSolutionPuzzles++;
  totals.trials++;
  results.push({ trial, puzzle: encodeCompactPuzzle(jigs), solution: grid.flat().join(''), mismatches });
  if (trial % 10 === 0 || trial === trials) {
    const report = { seed, elapsedSeconds: (Date.now() - started) / 1000, totals, results };
    writeFileSync('audit-results/notes-1000.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...totals, elapsedSeconds: report.elapsedSeconds }));
  }
}
assert.equal(totals.trials, trials);
assert.equal(totals.falseInclusions, 0, 'Some displayed candidates have no valid completion');
assert.equal(totals.falseExclusions, 0, 'Some valid candidates are omitted');
assert.equal(totals.missingKnownSolution, 0, 'Some known solution digits are omitted');
