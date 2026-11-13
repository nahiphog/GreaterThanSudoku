import { techniqueScore } from './difficulty';
import test from 'node:test';
import assert from 'node:assert/strict';
import { RING, CORNERS, findPhistomefel } from './phistomefel';
import { emptyGrid, bit } from './vendor/sudokui/board';
import { generateSolution } from './sudoku';

for(const [source,target] of [[RING,CORNERS],[CORNERS,RING]]) {
  test('Ring equality propagates absent digits in either direction '+source[0],()=>{
    const g=emptyGrid();for(const c of source)g.cands[c]&=~bit(9);
    const step=findPhistomefel(g)!;
    assert.deepEqual(step.eliminations,target.map(cell=>({cell,digit:9})));
    assert.equal(step.highlights[0].cells.length,16);
    assert.equal(step.highlights[1].cells.length,16);
  });
  test('Three forced occurrences cap the other side '+source[0],()=>{
    const g=emptyGrid();
    source.forEach((c,i)=>g.cands[c]=i<3?bit(2):511&~bit(2));
    target.slice(0,3).forEach(c=>g.values[c]=2);
    const step=findPhistomefel(g)!;
    assert.deepEqual(step.eliminations,target.slice(3).map(cell=>({cell,digit:2})));
  });
  test('All three possible locations become forced '+source[0],()=>{
    const g=emptyGrid();source.slice(0,3).forEach(c=>g.values[c]=2);
    target.slice(3).forEach(c=>g.cands[c]&=~bit(2));
    const step=findPhistomefel(g)!;
    assert.equal(step.eliminations.length,37);
    assert.equal(step.eliminations.filter(e=>target.slice(0,3).includes(e.cell)&&e.digit!==2).length,24);
    assert.equal(step.eliminations.filter(e=>source.slice(3).includes(e.cell)&&e.digit===2).length,13);
  });
}
test('No unsupported deduction from unrestricted or overlapping count ranges',()=>{
  assert.equal(findPhistomefel(emptyGrid()),null);
  const g=emptyGrid();g.cands[RING[0]]=bit(2);g.cands[CORNERS[0]]&=~bit(2);
  assert.equal(findPhistomefel(g),null);
});
test('Equal multisets and candidate preservation across 1000 complete grids',()=>{
  let seed=12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let trial=0;trial<1000;trial++) {
    const solution=generateSolution().flat();
    assert.deepEqual(RING.map(c=>solution[c]).sort(),CORNERS.map(c=>solution[c]).sort());
    const g=emptyGrid();
    for(let c=0;c<81;c++) {
      g.cands[c]=bit(solution[c]);
      for(let d=1;d<=9;d++)if(random()<0.2)g.cands[c]|=bit(d);
      if(random()<0.2)g.values[c]=solution[c];
    }
    const step=findPhistomefel(g);
    if(step)for(const e of step.eliminations)assert.notEqual(e.digit,solution[e.cell]);
  }
});

test('Phistomefel Ring costs 200 points per instance',()=>{assert.equal(techniqueScore('Phistomefel Ring'),200);});
