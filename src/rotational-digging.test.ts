import test from 'node:test';
import assert from 'node:assert/strict';
import {createJigs} from './sudoku';
import {digJigs,diggingGroups,rotationalPosition,type DigProgress} from './digging';
import {checkUniqueness} from './uniqueness';
import {searchDomains} from './six-solver';
import {analyzeSimulationTrial} from './simulation-trial';
import {decodeCompactPuzzle} from './compact';
const key=(j:{row:number;col:number;direction:string})=>`${j.row},${j.col},${j.direction}`;
const grid=(size:number)=>Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>(r*(size/3)+Math.floor(r/3)+c)%size+1));
for(const size of [6,9]){
  test(`${size}x${size} rotational groups cover every edge exactly once`,()=>{
    const jigs=createJigs(grid(size)),groups=diggingGroups(jigs,size,'rotational');
    assert.equal(groups.length,size===6?21:54);
    assert.equal(new Set(groups.flat()).size,jigs.length);
    for(const [a,b] of groups){assert.equal(key(rotationalPosition(a,size)),key(b));assert.equal(key(rotationalPosition(b,size)),key(a));}
    assert.deepEqual(rotationalPosition(jigs[0],size),{row:size-1,col:size-2,direction:'horizontal'});
    assert.throws(()=>diggingGroups(jigs.slice(1),size,'rotational'),/paired/);
  });
  if(size===9){
    test('9x9 paired digging checks both removed jigs in each uniqueness test',()=>{
      const progress:DigProgress[]=[],stop=new Error('Bounded 9x9 check');
      assert.throws(()=>digJigs(createJigs(grid(9)),9,p=>{progress.push(p);if(p.tested===4)throw stop;},()=>.37,'rotational'),e=>e===stop);
      assert.equal(progress.length,4);
      progress.forEach((p,i)=>{assert.equal(p.total,54);assert.equal(p.tested,i+1);const before=i?progress[i-1].remaining:108;assert.ok(p.remaining===before||p.remaining===before-2);});
      assert.ok(progress[3].remaining<108);
    });
    continue;
  }
  test(`${size}x${size} paired digging preserves uniqueness, symmetry, and pair minimality`,()=>{
    const jigs=createJigs(grid(size)),snapshot=JSON.stringify(jigs),progress:DigProgress[]=[];
    const dug=digJigs(jigs,size,p=>progress.push(p),()=>.37,'rotational');
    assert.equal(JSON.stringify(jigs),snapshot);
    assert.ok(dug.length>0&&dug.length<jigs.length);assert.equal(dug.length%2,0);
    assert.equal(progress.length,jigs.length/2);
    progress.forEach((p,i)=>{assert.equal(p.tested,i+1);assert.equal(p.total,jigs.length/2);const before=i?progress[i-1].remaining:jigs.length;assert.ok(p.remaining===before||p.remaining===before-2);});
    const groups=diggingGroups(dug,size,'rotational');
    assert.equal(checkUniqueness(dug,undefined,size).count,1);
    if(size===6){
      const independent=searchDomains(dug,size,Array.from({length:36},()=>[1,2,3,4,5,6]),2);
      assert.deepEqual(independent.solutions,[grid(size).flat()]);
    }
    for(const pair of groups)assert.equal(checkUniqueness(dug.filter(j=>!pair.includes(j)),undefined,size).count,2);
  });
}
test('both simulation modes forward rotational digging and export the paired result',()=>{
  const random=Math.random;Math.random=()=>.37;
  try{for(const mode of ['difficulty','jigs'] as const){
    const result=analyzeSimulationTrial(grid(6),mode,mode==='difficulty',0,'rotational')!;
    const {jigs}=decodeCompactPuzzle(result.string);
    assert.equal(diggingGroups(jigs,6,'rotational').length*2,result.jigCount);
    assert.ok(result.jigCount<42);assert.equal(checkUniqueness(jigs,undefined,6).count,1);
    assert.equal(result.score!==undefined,mode==='difficulty');
  }}finally{Math.random=random;}
});
