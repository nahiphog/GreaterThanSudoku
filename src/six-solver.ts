import type { Jig } from './sudoku';
import { jigCandidates } from './candidates';
import type { SolveFrame } from './logical-solver';

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

/** Size-aware singles, intersections and pairs; the vendored advanced engine is 9x9-only. */
export function solveSix(jigs: Jig[], emit: (frame: SolveFrame) => void, allowBacktracking = true) {
  const size = 6, units = unitsFor(size), edges = edgesFor(jigs, size);
  const values = Array<number>(36).fill(0);
  let candidates = jigCandidates(jigs, size), logicSteps = 0, bruteForceUses = 0;
  const name = (c: number) => `R${Math.floor(c / size) + 1}C${c % size + 1}`;
  const record = (title: string, description: string, kind: SolveFrame['kind'], oldValues = [...values], oldCandidates = candidates.map(d => [...d])) => {
    emit({ title, description, kind, values: [...values], candidates: candidates.map(d => [...d]),
      placements: values.flatMap((d, c) => d && !oldValues[c] ? [{ cell: c, digit: d }] : []),
      eliminations: candidates.flatMap((ds, c) => values[c] ? [] : oldCandidates[c].filter(d => !ds.includes(d)).map(digit => ({cell:c,digit}))) });
  };
  record('Local jig notes', 'Start with local jig bounds in six 3-row by 2-column regions.', 'initial');
  while (values.some(v => !v)) {
    if (candidates.some((d,c) => !values[c] && !d.length)) throw new Error('Contradictory candidates.');
    const oldValues = [...values], oldCandidates = candidates.map(d => [...d]);
    let title = '', description = '', placement: [number, number] | undefined;
    let kind: SolveFrame['kind'] = 'logic';
    for (const [a,b] of edges) {
      const left = values[a] ? [values[a]] : candidates[a], right = values[b] ? [values[b]] : candidates[b];
      if (!values[a]) candidates[a] = left.filter(x => right.some(y => x < y));
      if (!values[b]) candidates[b] = right.filter(y => left.some(x => x < y));
      if (candidates[a].length !== oldCandidates[a].length || candidates[b].length !== oldCandidates[b].length) {
        title = 'Jig comparison'; description = `${name(a)} < ${name(b)}: remove candidates without a supporting value across this jig.`; break;
      }
    }
    if (!title) {
      const cell = values.findIndex((v,c) => !v && candidates[c].length === 1);
      if (cell >= 0) { placement = [cell,candidates[cell][0]]; title = 'Naked Single'; description = `${name(cell)} has only candidate ${placement[1]}.`; }
    }
    if (!title) outer: for (const unit of units) for (let d=1;d<=size;d++) {
      if (unit.some(c => values[c] === d)) continue;
      const cells = unit.filter(c => !values[c] && candidates[c].includes(d));
      if (cells.length === 1) { placement=[cells[0],d]; title='Hidden Single'; description=`${name(cells[0])} is the only location for ${d} in the unit (${unit.map(name).join(', ')}).`; break outer; }
    }
    if (!title) outer: for (let u=0;u<units.length;u++) for (let v=0;v<units.length;v++) {
      if (u===v || (u<12 && v<12) || (u>=12 && v>=12)) continue;
      for (let d=1;d<=size;d++) {
        if (units[u].some(c=>values[c]===d)) continue;
        const cells=units[u].filter(c=>!values[c] && candidates[c].includes(d));
        const remove=units[v].filter(c=>!units[u].includes(c) && !values[c] && candidates[c].includes(d));
        if (cells.length>1 && cells.every(c=>units[v].includes(c)) && remove.length) {
          remove.forEach(c=>{candidates[c]=candidates[c].filter(x=>x!==d)});
          title=u>=12?'Locked Candidates (Pointing)':'Locked Candidates (Claiming)'; description=`Digit ${d} is confined to ${cells.map(name).join(', ')} in one unit, eliminating it from the rest of the intersecting unit.`; break outer;
        }
      }
    }
    if (!title) outer: for (const unit of units) for (const a of unit) for (const b of unit) {
      if (b<=a || values[a] || values[b] || candidates[a].length!==2 || candidates[a].join()!==candidates[b].join()) continue;
      const pair=candidates[a];
      const others=unit.filter(c=>c!==a&&c!==b&&!values[c]&&candidates[c].some(d=>pair.includes(d)));
      if (others.length) { others.forEach(c=>{candidates[c]=candidates[c].filter(d=>!pair.includes(d))}); title='Naked Pair'; description=`${name(a)} and ${name(b)} contain only ${pair.join(', ')}, so remove those digits from other cells in their shared unit.`; break outer; }
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
    record(title,description,kind,oldValues,oldCandidates);
  }
  return {usedBacktracking:bruteForceUses>0,logicSteps,bruteForceUses};
}
