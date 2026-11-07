import test from 'node:test';
import assert from 'node:assert/strict';
import { rateUniquePuzzle, solveUniquePuzzle, ratePuzzle, solvePuzzle } from './difficulty';
import { createJigs } from './sudoku';
import { DISABLED_TECHNIQUES, LOGIC_ORDER, type SolveFrame } from './logical-solver';
import { TECHS } from './techniques';
import { decodeCompactPuzzle } from './compact';
import { checkBacktrackingUniqueness } from './backtracking-uniqueness';

for (const size of [6,9]) {
  test(`${size}x${size} non-unique puzzles produce no rating or walkthrough`,()=>{
    assert.deepEqual(rateUniquePuzzle([],size),{count:2,rating:null});
    const frames: SolveFrame[]=[];
    assert.equal(solveUniquePuzzle([],size,frame=>frames.push(frame)),null);
    assert.deepEqual(frames,[]);
  });
  test(`${size}x${size} technique step lists match the actual verified walkthrough`,()=>{
    const grid=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>(r*(size/3)+Math.floor(r/3)+c)%size+1));
    const jigs=createJigs(grid), analysis=rateUniquePuzzle(jigs,size);
    assert.equal(analysis.count,1);assert.ok(analysis.rating);
    const frames: SolveFrame[]=[];
    assert.ok(solveUniquePuzzle(jigs,size,frame=>frames.push(frame)));
    const allSteps:number[]=[];
    for (const item of analysis.rating.tally) for (const step of item.steps) {
      assert.ok(step>0&&step<frames.length);
      assert.equal(frames[step].kind,'logic');assert.equal(frames[step].title,item.name);allSteps.push(step);
    }
    assert.deepEqual(allSteps.sort((a,b)=>a-b),Array.from({length:frames.length-1},(_,i)=>i+1));
  });
}
test('backtracking tally points to its walkthrough frame while preserving per-guess scoring',()=>{
  const frames:SolveFrame[]=[];solvePuzzle([],6,frame=>frames.push(frame));
  const rating=ratePuzzle([],6),item=rating.tally.find(t=>t.name.startsWith('Brute force'))!;
  assert.deepEqual(item.steps,frames.flatMap((f,i)=>f.kind==='backtracking'?[i]:[]));
  assert.equal(rating.score,rating.tally.reduce((sum,t)=>sum+t.count*t.score,0));
  assert.equal(item.score,10000);
});
test('all twelve requested techniques are excluded from the active logical order',()=>{
  assert.deepEqual([...DISABLED_TECHNIQUES].map(key=>TECHS[key as keyof typeof TECHS].name).sort(),['3D Medusa','Finned Jellyfish','Grouped Nice Loop','Aligned Pair Exclusion','ALS-XY-Chain','Digit Forcing Chain','Nishio Forcing Chain','Sashimi Swordfish','Alternating Inference Chain','Pattern Overlay','Cell Forcing Chain','Finned X-Wing'].sort());
  assert.ok(LOGIC_ORDER.every(key=>!DISABLED_TECHNIQUES.has(key)));
});
test('reported 6x6 puzzle resumes logical deductions after search at step 14',()=>{
  const {jigs,size}=decodeCompactPuzzle('<0<0<>0<0<<0<0>>0<0><0>0<>0>0>∧v0v∧v∧0vv∧v0∧v∧v0v∧v∧0∧∧vv0∧v');
  const independent=checkBacktrackingUniqueness(jigs,size);
  assert.equal(independent.count,1);
  const frames:SolveFrame[]=[];
  const result=solvePuzzle(jigs,size,f=>frames.push(f));
  assert.equal(frames[14].kind,'backtracking');
  assert.equal(frames[14].placements.length,1);
  assert.equal(frames[15].kind,'logic');
  assert.equal(frames.length-1,42);
  assert.deepEqual(frames.at(-1)!.values,independent.solutions[0]);
  for(const f of frames)for(let c=0;c<36;c++)assert.ok(f.values[c]===independent.solutions[0][c] || (!f.values[c]&&f.candidates[c].includes(independent.solutions[0][c])));
  const rating=ratePuzzle(jigs,size);
  const brute=rating.tally.find(t=>t.name.startsWith('Brute force'))!;
  assert.deepEqual(brute.steps,[14]);
  assert.equal(brute.count,result.bruteForceUses);
});
