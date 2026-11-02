import type { Jig } from './sudoku';

/** Bounds from all transitively smaller/larger cells in each Sudoku unit.
 * Counts distinct cells, not just the length of a single inequality chain.
 * These are pencil marks from jig ordering, not a full-solution search.
 */
export function jigCandidates(jigs: Jig[]): number[][] {
  const less = Array.from({ length: 81 }, () => Array<boolean>(81).fill(false));
  for (const jig of jigs) {
    const a = jig.row * 9 + jig.col;
    const b = a + (jig.direction === 'horizontal' ? 1 : 9);
    const ascending = jig.symbol === '<' || jig.symbol === '∧';
    less[ascending ? a : b][ascending ? b : a] = true;
  }
  for (let via = 0; via < 81; via++) {
    for (let from = 0; from < 81; from++) {
      if (!less[from][via]) continue;
      for (let to = 0; to < 81; to++) less[from][to] ||= less[via][to];
    }
  }
  if (less.some((row, i) => row[i])) throw new Error('The jigs contain a contradictory cycle.');
  return Array.from({ length: 81 }, (_, cell) => {
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    const units = [
      Array.from({ length: 9 }, (_, i) => row * 9 + i),
      Array.from({ length: 9 }, (_, i) => i * 9 + col),
      Array.from({ length: 9 }, (_, i) => (Math.floor(row / 3) * 3 + Math.floor(i / 3)) * 9 + Math.floor(col / 3) * 3 + i % 3),
    ];
    const smaller = Math.max(...units.map(unit => unit.filter(peer => less[peer][cell]).length));
    const larger = Math.max(...units.map(unit => unit.filter(peer => less[cell][peer]).length));
    return Array.from({ length: Math.max(0, 9 - smaller - larger) }, (_, i) => smaller + i + 1);
  });
}

/** Every returned digit has a full Sudoku completion satisfying every jig. */
export function plausibleCandidates(jigs: Jig[]): number[][] {
  if (!jigs.length) return Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const digits = (mask: number) => Array.from({ length: 9 }, (_, i) => i + 1).filter(d => mask & (1 << (d - 1)));
  const units: number[][] = [];
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) units.push(Array.from({ length: 9 }, (_, i) => (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + i % 3));
  const edges = jigs.map(jig => {
    const a = jig.row * 9 + jig.col;
    const b = a + (jig.direction === 'horizontal' ? 1 : 9);
    return jig.symbol === '<' || jig.symbol === '∧' ? [a, b] : [b, a];
  });
  function propagate(state: number[]): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      const narrow = (cell: number, allowed: number) => {
        const next = state[cell] & allowed;
        if (next !== state[cell]) { state[cell] = next; changed = true; }
        return next !== 0;
      };
      for (const [a, b] of edges) {
        if (!state[a] || !state[b]) return false;
        const maxB = 31 - Math.clz32(state[b]);
        if (!narrow(a, (1 << maxB) - 1)) return false;
        const minA = 31 - Math.clz32(state[a] & -state[a]);
        if (!narrow(b, 511 & ~((1 << (minA + 1)) - 1))) return false;
      }
      for (const unit of units) {
        let fixed = 0;
        for (const cell of unit) {
          const mask = state[cell];
          if (!mask) return false;
          if ((mask & (mask - 1)) === 0) {
            if (fixed & mask) return false;
            fixed |= mask;
          }
        }
        for (const cell of unit) {
          if (state[cell] & (state[cell] - 1)) {
            if (!narrow(cell, ~fixed)) return false;
          }
        }
        for (let bit = 1; bit <= 256; bit <<= 1) {
          let only = -1;
          for (const cell of unit) if (state[cell] & bit) {
            if (only >= 0) { only = -2; break; }
            only = cell;
          }
          if (only === -1) return false;
          if (only >= 0 && !narrow(only, bit)) return false;
        }
      }
    }
    return true;
  }
  function solve(state: number[]): number[] | null {
    if (!propagate(state)) return null;
    let chosen = -1;
    let choices: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (!(state[i] & (state[i] - 1))) continue;
      const options = digits(state[i]);
      if (chosen < 0 || options.length < choices.length) { chosen = i; choices = options; }
    }
    if (chosen < 0) return state;
    for (const digit of choices) {
      const next = [...state];
      next[chosen] = 1 << (digit - 1);
      const result = solve(next);
      if (result) return result;
    }
    return null;
  }
  const base = jigCandidates(jigs).map(values => values.reduce((mask, d) => mask | (1 << (d - 1)), 0));
  if (!propagate(base)) throw new Error('This puzzle has no valid completion.');
  const supported = Array<number>(81).fill(0);
  for (let cell = 0; cell < 81; cell++) {
    for (const digit of digits(base[cell])) {
      const bit = 1 << (digit - 1);
      if (supported[cell] & bit) continue;
      const trial = [...base];
      trial[cell] = bit;
      const solution = solve(trial);
      if (solution) {
        for (let i = 0; i < 81; i++) supported[i] |= solution[i];
      } else {
        base[cell] &= ~bit;
      }
    }
  }
  if (supported.some(mask => !mask)) throw new Error('This puzzle has no valid completion.');
  return supported.map(digits);
}
