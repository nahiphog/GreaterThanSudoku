import test from 'node:test';
import assert from 'node:assert/strict';
import { createJigs } from './sudoku';
import { digJigs, type DigProgress } from './digging';
import { encodeCompactPuzzle, decodeCompactPuzzle } from './compact';
import { searchDomains } from './six-solver';

for(const size of [6])test(`digging ${size}x${size} preserves uniqueness and leaves no removable jig`,()=>{
  const grid=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>(r*(size/3)+Math.floor(r/3)+c)%size+1));
  const jigs=createJigs(grid),snapshot=JSON.stringify(jigs),progress:DigProgress[]=[];
  const dug=digJigs(jigs,size,p=>progress.push(p),()=>.37);
  assert.equal(JSON.stringify(jigs),snapshot);
  assert.ok(dug.length>0&&dug.length<jigs.length);
  assert.equal(progress.length,jigs.length);
  progress.forEach((p,i)=>{assert.equal(p.tested,i+1);assert.equal(p.total,jigs.length);if(i)assert.ok(p.remaining===progress[i-1].remaining||p.remaining===progress[i-1].remaining-1);});
  const check=(clues:typeof jigs)=>(()=>{const result=searchDomains(clues,size,Array.from({length:size*size},()=>Array.from({length:size},(_,i)=>i+1)),2);return {count:result.solutions.length,solutions:result.solutions};})();
  const independent=check(dug);
  assert.equal(independent.count,1);assert.deepEqual(independent.solutions[0],grid.flat());
  for(let i=0;i<dug.length;i++)assert.equal(check(dug.filter((_,j)=>j!==i)).count,2);
  const compact=encodeCompactPuzzle(dug,size);
  assert.equal(decodeCompactPuzzle(compact).jigs.length,dug.length);
  assert.equal([...compact].filter(x=>x!=='0').length,dug.length);
});

test('9x9 digging checks removals and reports the 108-jig layout',()=>{
  const grid=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>(r*3+Math.floor(r/3)+c)%9+1));
  const stopped=new Error('Stop bounded 9x9 regression after two checked removals');
  const progress:DigProgress[]=[];
  assert.throws(()=>digJigs(createJigs(grid),9,p=>{progress.push(p);if(p.tested===2)throw stopped;},()=>.37),e=>e===stopped);
  assert.deepEqual(progress,[{tested:1,total:108,remaining:107},{tested:2,total:108,remaining:106}]);
});
