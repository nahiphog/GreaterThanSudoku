import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSolution,createJigs,type Jig} from './sudoku';
import {jigCandidates} from './candidates';
import {encodeCompactPuzzle} from './compact';
import {solveSix,unitsFor,edgesFor} from './six-solver';
import {checkUniqueness} from './uniqueness';
import {ratePuzzle} from './difficulty';

// Independent enumeration from assigned values: no notes or logical eliminations.
function enumerate(jigs:Jig[]) {
  const values=Array<number>(36).fill(0), solutions:number[][]=[];
  const units=unitsFor(6), edges=edgesFor(jigs,6);
  function visit() {
    let chosen=-1,options:number[]=[];
    for(let c=0;c<36;c++) if(!values[c]) {
      const legal=[1,2,3,4,5,6].filter(d=>!units.some(u=>u.includes(c)&&u.some(p=>values[p]===d))&&!edges.some(([a,b])=>a===c&&values[b]&&d>=values[b]||b===c&&values[a]&&d<=values[a]));
      if(!legal.length)return;
      if(chosen<0||legal.length<options.length){chosen=c;options=legal;}
    }
    if(chosen<0){solutions.push([...values]);return;}
    for(const d of options){values[chosen]=d;visit();values[chosen]=0;}
  }
  visit();return solutions;
}
test('6x6 uses the illustrated six 3-row by 2-column regions and 60-character encoding',()=>{
  assert.deepEqual(unitsFor(6).slice(12),[[0,1,6,7,12,13],[2,3,8,9,14,15],[4,5,10,11,16,17],[18,19,24,25,30,31],[20,21,26,27,32,33],[22,23,28,29,34,35]]);
  for(let trial=0;trial<1000;trial++){
    const grid=generateSolution(6),flat=grid.flat(),jigs=createJigs(grid),notes=jigCandidates(jigs,6);
    for(const unit of unitsFor(6))assert.equal(new Set(unit.map(c=>flat[c])).size,6);
    assert.equal(jigs.length,42);assert.equal(encodeCompactPuzzle(jigs,6).length,60);
    assert.equal([...encodeCompactPuzzle(jigs,6)].filter(s=>s==='0').length,18);
    flat.forEach((d,c)=>assert.ok(notes[c].includes(d)));
  }
});
test('6x6 logical steps preserve every solution and uniqueness agrees with independent enumeration',()=>{
  for(let trial=0;trial<30;trial++) {
    const jigs=createJigs(generateSolution(6)),solutions=enumerate(jigs);
    assert.ok(solutions.length>0);
    solveSix(jigs,frame=>{
      if(frame.kind==='backtracking') {assert.ok(solutions.some(s=>s.join()===frame.values.join()));return;}
      for(const solution of solutions) solution.forEach((d,c)=>{if(frame.values[c])assert.equal(frame.values[c],d);else assert.ok(frame.candidates[c].includes(d));});
    });
    const check=checkUniqueness(jigs,()=>{},6);assert.equal(check.count,Math.min(2,solutions.length));
  }
});
test('difficulty tally is sorted and every guessed branch costs 10000',()=>{
  for(const size of [6,9]) {
    const rating=ratePuzzle([],size);
    assert.ok(rating.bruteForceUses>1);
    assert.equal(rating.score,rating.bruteForceUses*10000);
    assert.equal(rating.tally.find(t=>t.name.startsWith('Brute force'))!.count,rating.bruteForceUses);
  }
  const rating=ratePuzzle(createJigs(generateSolution(6)),6);
  assert.equal(rating.score,rating.tally.reduce((sum,t)=>sum+t.count*t.score,0));
  assert.ok(rating.tally.every((t,i)=>!i||t.score>=rating.tally[i-1].score));
});
