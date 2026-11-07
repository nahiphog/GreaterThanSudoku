import test from 'node:test';
import assert from 'node:assert/strict';
import { rateUniquePuzzle, solveUniquePuzzle, ratePuzzle, solvePuzzle } from './difficulty';
import { createJigs } from './sudoku';
import { DISABLED_TECHNIQUES, LOGIC_ORDER, type SolveFrame } from './logical-solver';
import { TECHS } from './techniques';

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
  assert.deepEqual(item.steps,[frames.length-1]);assert.equal(frames[item.steps[0]].kind,'backtracking');
  assert.equal(rating.score,item.count*10000);
});
test('all seven requested techniques are excluded from the active logical order',()=>{
  assert.deepEqual([...DISABLED_TECHNIQUES].map(key=>TECHS[key as keyof typeof TECHS].name).sort(),['3D Medusa','Finned Jellyfish','Grouped Nice Loop','Aligned Pair Exclusion','ALS-XY-Chain','Digit Forcing Chain','Nishio Forcing Chain'].sort());
  assert.ok(LOGIC_ORDER.every(key=>!DISABLED_TECHNIQUES.has(key)));
});
