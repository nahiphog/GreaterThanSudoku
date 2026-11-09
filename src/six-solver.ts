import { techniqueHighlights, jigHighlights } from './step-highlights';
import type { Jig } from './sudoku';
import { jigCandidates } from './candidates';
import { LOGIC_ORDER, DISABLED_TECHNIQUES, nextEnabledStep, type SolveFrame } from './logical-solver';
import { emptyGrid, bit, digitsOf, isBroken } from './vendor/sudokui-six/board';
import { findStep, applyStep } from './vendor/sudokui-six/humanSolver';
import { TECHS } from './techniques';

// A six-line fish leaves no outside line to eliminate from; seven lines cannot fit.
export const SIX_LOGIC_ORDER = LOGIC_ORDER.filter(t => t !== 'WHALE' && t !== 'LEVIATHAN');

export function unitsFor(size: number) {
  const width = size / 3;
  return [
    ...Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => r * size + c)),
    ...Array.from({ length: size }, (_, c) => Array.from({ length: size }, (_, r) => r * size + c)),
    ...Array.from({ length: size }, (_, b) => Array.from({ length: size }, (_, i) => (Math.floor(b / 3) * 3 + Math.floor(i / width)) * size + b % 3 * width + i % width)),
  ];
}
export function edgesFor(jigs: Jig[], size: number) {
  return jigs.map(j => {
    const a = j.row * size + j.col, b = a + (j.direction === 'horizontal' ? 1 : size);
    return j.symbol === '<' || j.symbol === '∧' ? [a, b] : [b, a];
  });
}

/** Domain search used only after the logical pass stalls. Counts every guessed branch. */
export function searchDomains(jigs: Jig[], size: number, initial: number[][], limit = 1) {
  const units = unitsFor(size), edges = edgesFor(jigs, size), solutions: number[][] = [];
  let bruteForceUses = 0;
  function visit(domains: number[][]) {
    let changed = true;
    const narrow = (cell: number, keep: (d: number) => boolean) => {
      const next = domains[cell].filter(keep);
      if (next.length !== domains[cell].length) { domains[cell] = next; changed = true; }
    };
    while (changed) {
      changed = false;
      if (domains.some(d => !d.length)) return;
      for (const [a, b] of edges) {
        narrow(a, x => domains[b].some(y => x < y));
        narrow(b, y => domains[a].some(x => x < y));
      }
      for (const unit of units) {
        const singles = unit.filter(c => domains[c].length === 1).map(c => domains[c][0]);
        if (new Set(singles).size !== singles.length) return;
        for (const c of unit) if (domains[c].length > 1) narrow(c, d => !singles.includes(d));
        for (let d = 1; d <= size; d++) {
          const cells = unit.filter(c => domains[c].includes(d));
          if (!cells.length) return;
          if (cells.length === 1) narrow(cells[0], x => x === d);
        }
      }
    }
    if (domains.some(d => !d.length)) return;
    let cell = -1;
    domains.forEach((d, c) => { if (d.length > 1 && (cell < 0 || d.length < domains[cell].length)) cell = c; });
    if (cell < 0) { solutions.push(domains.map(d => d[0])); return; }
    for (const digit of domains[cell]) {
      bruteForceUses++;
      const next = domains.map(d => [...d]); next[cell] = [digit]; visit(next);
      if (solutions.length >= limit) return;
    }
  }
  visit(initial.map(d => [...d]));
  return { solutions, bruteForceUses };
}

/** Imported logical techniques adapted to 3-row by 2-column regions. */
export function solveSix(jigs: Jig[], emit: (frame: SolveFrame) => void, allowBacktracking = true) {
  const size = 6, units = unitsFor(size), edges = edgesFor(jigs, size);
  const values = Array<number>(36).fill(0);
  let candidates = jigCandidates(jigs, size), logicSteps = 0, bruteForceUses = 0;
  const name = (c: number) => `R${Math.floor(c / size) + 1}C${c % size + 1}`;
  const record = (title: string, description: string, kind: SolveFrame['kind'], oldValues = [...values], oldCandidates = candidates.map(d => [...d]), highlights?: SolveFrame['highlights']) => {
    emit({ highlights, title, description, kind, values: [...values], candidates: candidates.map(d => [...d]),
      placements: values.flatMap((d, c) => d && !oldValues[c] ? [{ cell: c, digit: d }] : []),
      eliminations: candidates.flatMap((ds, c) => values[c] ? [] : oldCandidates[c].filter(d => !ds.includes(d)).map(digit => ({cell:c,digit}))) });
  };
  record('Local jig notes', 'Start with local jig bounds in six 3-row by 2-column regions.', 'initial');
  while (values.some(v => !v)) {
    if (candidates.some((d,c) => !values[c] && !d.length)) throw new Error('Contradictory candidates.');
    const oldValues = [...values], oldCandidates = candidates.map(d => [...d]);
    let title = '', description = '', placement: [number, number] | undefined;
    let kind: SolveFrame['kind'] = 'logic';
    let highlights: SolveFrame['highlights'];
    for (const [a,b] of edges) {
      const left = values[a] ? [values[a]] : candidates[a], right = values[b] ? [values[b]] : candidates[b];
      if (!values[a]) candidates[a] = left.filter(x => right.some(y => x < y));
      if (!values[b]) candidates[b] = right.filter(y => left.some(x => x < y));
      if (candidates[a].length !== oldCandidates[a].length || candidates[b].length !== oldCandidates[b].length) {
        highlights = jigHighlights(a,b,{values:oldValues,candidates:oldCandidates});
        title = 'Jig comparison'; description = `${name(a)} < ${name(b)}: remove candidates without a supporting value across this jig.`; break;
      }
    }
    if (!title && jigs.length) {
      const state = emptyGrid();
      state.values.set(values);
      candidates.forEach((ds,c) => { state.cands[c] = ds.reduce((m,d) => m | bit(d), 0); });
      const step = nextEnabledStep(SIX_LOGIC_ORDER,tech=>findStep(tech,state));
      if (step && !DISABLED_TECHNIQUES.has(step.tech) && TECHS[step.tech].category !== 'Uniqueness') {
        highlights = techniqueHighlights(step,{values:oldValues,candidates:oldCandidates},size);
        applyStep(state, step);
        if (isBroken(state)) throw new Error('A logical deduction produced contradictory candidates.');
        state.values.forEach((v,c) => { values[c] = v; });
        candidates = [...state.cands].map(digitsOf);
        title = TECHS[step.tech].name; description = step.description;
      }
    }
    if (!title) {
      if (!allowBacktracking) break;
      const result=searchDomains(jigs,size,candidates.map((d,c)=>values[c]?[values[c]]:d));
      if (!result.solutions.length) throw new Error('No completion found.');
      bruteForceUses+=result.bruteForceUses;
      const cell=candidates.reduce((best,ds,c)=>!values[c] && (best<0 || ds.length<candidates[best].length)?c:best,-1);
      placement=[cell,result.solutions[0][cell]];
      title='Backtracking placement — last resort';
      description=`Logical techniques stalled. Search used ${result.bruteForceUses} guessed branches to find a completion. Take ${name(cell)} = ${placement[1]} from that completion, then resume logical deductions. This placement is search-assisted, not a logical deduction or uniqueness proof.`;
      kind='backtracking';
    }
    if (placement) {
      const [c,d]=placement; values[c]=d; candidates[c]=[];
      for (const unit of units.filter(u=>u.includes(c))) for (const peer of unit) if (!values[peer]) candidates[peer]=candidates[peer].filter(x=>x!==d);
    }
    if(kind==='logic')logicSteps++;
    record(title,description,kind,oldValues,oldCandidates,highlights);
  }
  return {usedBacktracking:bruteForceUses>0,logicSteps,bruteForceUses};
}
