import { techniqueHighlights, jigHighlights, type HighlightGroup } from './step-highlights';
import { jigCandidates } from './candidates';
import type { Jig } from './sudoku';
import { applyStep, findStep, SOLVE_ORDER, TECHS, type Step, type Tech } from './techniques';
import { emptyGrid, cloneGrid, bit, digitsOf, setValue, UNITS, type Grid } from './vendor/sudokui/board';

export type SolveFrame = {
  highlights?: HighlightGroup[];
  title: string; description: string; values: number[]; candidates: number[][];
  placements: { cell: number; digit: number }[];
  eliminations: { cell: number; digit: number }[];
  kind: 'initial' | 'logic' | 'backtracking';
};
// Classic uniqueness deductions can change inequalities when swapping digits.
export const DISABLED_TECHNIQUES = new Set(['MEDUSA_3D', 'FINNED_JELLYFISH', 'GROUPED_NICE_LOOP', 'ALIGNED_PAIR_EXCLUSION', 'ALS_XY_CHAIN', 'DIGIT_FORCING_CHAIN', 'NISHIO_FORCING_CHAIN', 'SASHIMI_SWORDFISH', 'AIC', 'PATTERN_OVERLAY', 'CELL_FORCING_CHAIN', 'FINNED_X_WING', 'XY_CHAIN', 'ALS_XZ', 'AIC_ALS', 'UNIT_FORCING_CHAIN', 'CHUTE_REMOTE_PAIR', 'FORCING_NET']);
export const LOGIC_ORDER = SOLVE_ORDER.filter(t => !DISABLED_TECHNIQUES.has(t) && TECHS[t].category !== 'Uniqueness' && t !== 'BRUTE_FORCE');
/** Imported grouped finders can return a different technique than requested. */
export function nextEnabledStep<T extends {tech:Tech}>(order:Tech[],finder:(tech:Tech)=>T|null):T|null {
  for(const tech of order){
    if(DISABLED_TECHNIQUES.has(tech))continue;
    const step=finder(tech);
    if(step && !DISABLED_TECHNIQUES.has(step.tech) && TECHS[step.tech].category!=='Uniqueness' && step.tech!=='BRUTE_FORCE')return step;
  }
  return null;
}
const name = (cell: number) => `R${Math.floor(cell / 9) + 1}C${cell % 9 + 1}`;

export function solveWithSteps(jigs: Jig[], emit: (frame: SolveFrame) => void, progress: (message: string) => void = () => {}, allowBacktracking = true) {
  const state = emptyGrid();
  jigCandidates(jigs).forEach((notes, i) => { state.cands[i] = notes.reduce((mask, d) => mask | bit(d), 0); });
  const edges = jigs.map(j => {
    const a = j.row * 9 + j.col, b = a + (j.direction === 'horizontal' ? 1 : 9);
    return j.symbol === '<' || j.symbol === '∧' ? [a, b] : [b, a];
  });
  const domain = (g: Grid, cell: number) => g.values[cell] ? [g.values[cell]] : digitsOf(g.cands[cell]);
  function valid(g: Grid) {
    for (const unit of UNITS) {
      let placed = 0, possible = 0;
      for (const cell of unit) {
        if (g.values[cell]) {
          const mask = bit(g.values[cell]);
          if (placed & mask) return false;
          placed |= mask; possible |= mask;
        } else {
          if (!g.cands[cell]) return false;
          possible |= g.cands[cell];
        }
      }
      if (possible !== 511) return false;
    }
    return edges.every(([a, b]) => domain(g, a).some(x => domain(g, b).some(y => x < y)));
  }
  function jigStep(g: Grid): { description: string; eliminations: Step['eliminations']; highlights: HighlightGroup[] } | null {
    for (const [a, b] of edges) {
      const left = domain(g, a), right = domain(g, b);
      const eliminations = [
        ...(!g.values[a] ? left.filter(x => !right.some(y => x < y)).map(digit => ({ cell: a, digit })) : []),
        ...(!g.values[b] ? right.filter(y => !left.some(x => x < y)).map(digit => ({ cell: b, digit })) : []),
      ];
      if (eliminations.length) return { highlights: jigHighlights(a,b,{values:g.values,candidates:[...g.cands].map(digitsOf)}), description: `${name(a)} < ${name(b)}. With ${name(a)} allowing ${left.join(', ')} and ${name(b)} allowing ${right.join(', ')}, remove digits that cannot satisfy this jig.`, eliminations };
    }
    return null;
  }
  function record(title: string, description: string, kind: SolveFrame['kind'], before?: Grid, step?: Step, highlights?: HighlightGroup[]) {
    const placements: SolveFrame['placements'] = [], eliminations: SolveFrame['eliminations'] = [];
    if (before) for (let cell = 0; cell < 81; cell++) {
      if (!before.values[cell] && state.values[cell]) placements.push({ cell, digit: state.values[cell] });
      if (!state.values[cell]) for (const digit of digitsOf(before.cands[cell] & ~state.cands[cell])) eliminations.push({ cell, digit });
    }
    emit({ highlights: step && before ? techniqueHighlights(step,{values:before.values,candidates:[...before.cands].map(digitsOf)},9) : highlights, title, description, kind, placements, eliminations, values: [...state.values], candidates: [...state.cands].map(digitsOf) });
  }
  if (!valid(state)) throw new Error('The local notes contradict the puzzle rules.');
  record('Local jig notes', 'Start with an empty grid and candidates from local jig deductions only.', 'initial');
  let logicSteps = 0;
  let bruteForceUses = 0;
  while (state.values.some(v => !v)) {
    // With no givens or jigs, digit symmetry precludes any forced deduction.
    if (!jigs.length) break;
    const before = cloneGrid(state);
    const jig = jigStep(state);
    if (jig) {
      for (const e of jig.eliminations) state.cands[e.cell] &= ~bit(e.digit);
      if (!valid(state)) throw new Error('A jig deduction produced a contradiction.');
      record('Jig comparison', jig.description, 'logic', before, undefined, jig.highlights);
    } else {
      progress('Trying sudokUI logical techniques…');
      const step = nextEnabledStep(LOGIC_ORDER,tech=>findStep(tech,state));
      if (!step) break;
      applyStep(state, step);
      if (!valid(state)) throw new Error(`The ${TECHS[step.tech].name} step produced a contradiction.`);
      if (state.values.every((v, i) => v === before.values[i]) && state.cands.every((v, i) => v === before.cands[i])) throw new Error('The technique made no progress.');
      record(TECHS[step.tech].name, step.description, 'logic', before, step);
    }
    logicSteps++;
    if (logicSteps > 810) throw new Error('Logical step limit exceeded.');
  }
  if (!state.values.some(v => !v)) return { usedBacktracking: false, logicSteps, bruteForceUses };
  if (!allowBacktracking) return { usedBacktracking: false, logicSteps, bruteForceUses };
  progress('Logical techniques stalled. Trying backtracking as a last resort…');
  // Search begins only after all applicable imported techniques have stalled.
  function search(g: Grid): Grid | null {
    while (true) {
      if (!valid(g)) return null;
      const jig = jigStep(g);
      if (jig) { for (const e of jig.eliminations) g.cands[e.cell] &= ~bit(e.digit); continue; }
      const single = [...g.cands].findIndex((mask, i) => !g.values[i] && digitsOf(mask).length === 1);
      if (single >= 0) { setValue(g, single, digitsOf(g.cands[single])[0]); continue; }
      break;
    }
    let cell = -1;
    for (let i = 0; i < 81; i++) if (!g.values[i] && (cell < 0 || digitsOf(g.cands[i]).length < digitsOf(g.cands[cell]).length)) cell = i;
    if (cell < 0) return g;
    for (const digit of digitsOf(g.cands[cell])) {
      bruteForceUses++;
      const branch = cloneGrid(g);
      setValue(branch, cell, digit);
      const result = search(branch);
      if (result) return result;
    }
    return null;
  }
  const before = cloneGrid(state);
  const result = search(cloneGrid(state));
  if (!result) throw new Error('No completion was found from the logical state.');
  state.values.set(result.values); state.cands.set(result.cands);
  record('Backtracking completion — last resort', 'The enabled logical techniques found no further deduction. A search supplied one valid completion. These placements are search results, not proven logical deductions; other completions may exist.', 'backtracking', before);
  return { usedBacktracking: true, logicSteps, bruteForceUses };
}
