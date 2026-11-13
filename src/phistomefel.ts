import { bit, digitsOf, type Grid } from './vendor/sudokui/board';
import type { HighlightGroup } from './step-highlights';

export const PHISTOMEFEL_NAME = 'Phistomefel Ring';
export const PHISTOMEFEL_SCORE = 200;
export const RING = Array.from({length:81},(_,c)=>c).filter(c=>{
  const r=Math.floor(c/9), col=c%9;
  return r>=2 && r<=6 && col>=2 && col<=6 && (r===2 || r===6 || col===2 || col===6);
});
export const CORNERS = Array.from({length:81},(_,c)=>c).filter(c=>{
  const r=Math.floor(c/9), col=c%9;
  return (r<2 || r>6) && (col<2 || col>6);
});

/** Equal multisets imply equal per-digit counts. Bounds deliberately ignore
 * correlations: they are conservative, local deductions, never a solution search. */
export function findPhistomefel(g:Grid) {
  const domain=(cell:number)=>g.values[cell]?[g.values[cell]]:digitsOf(g.cands[cell]);
  for(let digit=1;digit<=9;digit++) {
    const sides=[RING,CORNERS].map(cells=>({
      cells,
      forced:cells.filter(c=>domain(c).length===1 && domain(c)[0]===digit),
      possible:cells.filter(c=>domain(c).includes(digit)),
    }));
    const lower=Math.max(...sides.map(s=>s.forced.length));
    const upper=Math.min(...sides.map(s=>s.possible.length));
    if(lower>upper)throw new Error('Phistomefel Ring counts contradict the puzzle rules.');
    const eliminations:{cell:number;digit:number}[]=[];
    for(const side of sides)for(const cell of side.possible) {
      if(g.values[cell] || side.forced.includes(cell))continue;
      // All required occurrences already accounted for: no further occurrence.
      if(side.forced.length===upper)eliminations.push({cell,digit});
      // Every remaining possible occurrence is needed to meet the lower bound.
      else if(side.possible.length===lower)
        for(const other of digitsOf(g.cands[cell] & ~bit(digit)))eliminations.push({cell,digit:other});
    }
    if(!eliminations.length)continue;
    const highlights:HighlightGroup[]=sides.map((s,i)=>({
      role:i===0?'primary':'secondary',
      label:`${i===0?'Ring':'Corners'}: ${s.forced.length} forced and ${s.possible.length} possible occurrences of ${digit}`,
      cells:s.cells,
      candidates:s.possible.map(cell=>({cell,digit})),
    }));
    return {eliminations,highlights,description:`The ring and the four corners contain identical digit counts. For ${digit}, the ring allows ${sides[0].forced.length}–${sides[0].possible.length} occurrences and the corners allow ${sides[1].forced.length}–${sides[1].possible.length}. Both must therefore contain ${lower===upper?lower:`${lower}–${upper}`} occurrences. Remove candidates that would exceed this count or prevent reaching it.`};
  }
  return null;
}
