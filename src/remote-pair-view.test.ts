import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCompactPuzzle } from './compact';
import { solvePuzzle } from './difficulty';
import type { SolveFrame } from './logical-solver';
import { unitsFor } from './six-solver';

test('reported step 15 retains every Remote Pair cell and alternating candidate group',()=>{
  const {jigs,size}=decodeCompactPuzzle('>0>0>>0<0><0>0<<0<0<>0<0><0>0<vv0∧vv∧0v∧v∧0∧∧∧v0∧v∧v0vv∧∧0v∧');
  const frames:SolveFrame[]=[];solvePuzzle(jigs,size,f=>frames.push(f));
  const frame=frames[15];assert.equal(frame.title,'Remote Pair');assert.ok(frame.highlights);
  const dark=frame.highlights.find(g=>g.role==='purple-dark')!.candidates,light=frame.highlights.find(g=>g.role==='purple-light')!.candidates;
  const cells=[5,7,8,12,20,25,29,34];
  assert.deepEqual([...new Set([...dark,...light].map(x=>x.cell))].sort((a,b)=>a-b),cells);
  assert.equal(dark.length,8);assert.equal(light.length,8);
  for(const c of cells){
    const a=dark.find(x=>x.cell===c)!,b=light.find(x=>x.cell===c)!;
    assert.deepEqual([a.digit,b.digit].sort(),[1,2]);
    for(const other of dark)if(other.cell!==c&&unitsFor(6).some(u=>u.includes(c)&&u.includes(other.cell)))assert.notEqual(a.digit,other.digit);
  }
  assert.deepEqual([...new Set(frame.eliminations.map(x=>x.cell))],[18,33]);
  assert.ok(!frames[14].highlights?.some(g=>g.role==='purple-dark'));assert.ok(!frames[16].highlights?.some(g=>g.role==='purple-dark'));
});
