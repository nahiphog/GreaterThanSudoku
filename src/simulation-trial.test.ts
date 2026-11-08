import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSimulationTrial } from './simulation-trial';
import { decodeCompactPuzzle } from './compact';
import { checkUniqueness } from './uniqueness';
import { ratePuzzle, solvePuzzle } from './difficulty';

const grid=Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>(r*2+Math.floor(r/3)+c)%6+1));
test('jig simulation uses an inclusive count limit without difficulty ratings',()=>{
  const result=analyzeSimulationTrial(grid,'jigs',false,42)!;
  assert.equal(result.jigCount,42);assert.equal(result.metric,42);assert.equal(result.matches,true);
  assert.equal(result.score,undefined);assert.equal(result.tally,undefined);
  assert.equal(analyzeSimulationTrial(grid,'jigs',false,41)!.matches,false);
});
test('jig simulation digs before counting and exporting',()=>{
  const result=analyzeSimulationTrial(grid,'jigs',true,108)!;
  assert.ok(result.jigCount<42);assert.equal(result.score,undefined);assert.equal(result.tally,undefined);
  const {jigs}=decodeCompactPuzzle(result.string);
  assert.equal(jigs.length,result.jigCount);assert.equal(checkUniqueness(jigs,undefined,6).count,1);
});
test('difficulty simulation rates and exports the reduced jig set',()=>{
  const result=analyzeSimulationTrial(grid,'difficulty',true,0)!;
  const {jigs}=decodeCompactPuzzle(result.string);
  assert.ok(jigs.length<42);assert.equal(jigs.length,result.jigCount);
  const rating=ratePuzzle(jigs,6);
  assert.equal(result.score,rating.score);assert.deepEqual(result.tally,rating.tally);assert.equal(result.matches,true);
});
test('sparse regression puzzle charges each remaining search branch after advanced logic',()=>{
  const {jigs,size}=decodeCompactPuzzle('00>00<000>00<0>00<00>000000000000vv∧000∧0∧0000v000v000∧∧000∧');
  assert.equal(checkUniqueness(jigs,undefined,size).count,1);
  const rating=ratePuzzle(jigs,size);
  assert.ok(rating.bruteForceUses>0 && rating.bruteForceUses<83);
  assert.equal(rating.score,rating.tally.reduce((n,t)=>n+t.count*t.score,0));
  assert.equal(rating.tally.find(t=>t.name.startsWith('Brute force'))!.score,10000);
  const branches:number[]=[];
  solvePuzzle(jigs,size,f=>{if(f.kind==='backtracking')branches.push(Number(f.description.match(/used (\d+) guessed/)![1]));});
  assert.equal(branches.reduce((n,x)=>n+x,0),rating.bruteForceUses);
});
