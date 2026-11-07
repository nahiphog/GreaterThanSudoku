import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCompactPuzzle, encodeCompactPuzzle } from './compact';
import { generateSolution, createJigs } from './sudoku';
import { checkBacktrackingUniqueness } from './backtracking-uniqueness';
import { checkUniqueness } from './uniqueness';
import { stepNotes } from './step-notes';
import type { SolveFrame } from './logical-solver';

for (const size of [6,9]) {
  test(`${size}x${size} puzzle strings round trip including whitespace and legacy upward jigs`,()=>{
    const original=encodeCompactPuzzle(createJigs(generateSolution(size)),size);
    const parsed=decodeCompactPuzzle(' \n'+original.replace(/∧/g,'^').match(/.{1,10}/g)!.join('\n')+' ');
    assert.equal(parsed.size,size);assert.equal(parsed.string,original);
    assert.equal(encodeCompactPuzzle(parsed.jigs,size),original);
  });
  test(`verification parser supports non-unique and contradictory ${size}x${size} puzzles`,()=>{
    const blank=decodeCompactPuzzle('0'.repeat(2*size*(size-1)));
    assert.equal(checkBacktrackingUniqueness(blank.jigs,size).count,2);
    const blankResult=checkUniqueness(blank.jigs,undefined,size);
    assert.equal(blankResult.count,2);
    assert.equal(blankResult.usedBacktracking,true);
    const cycle=decodeCompactPuzzle(encodeCompactPuzzle([
      {row:0,col:0,direction:'horizontal',symbol:'<'},
      {row:0,col:1,direction:'vertical',symbol:'∧'},
      {row:1,col:0,direction:'horizontal',symbol:'>'},
      {row:0,col:0,direction:'vertical',symbol:'v'},
    ],size));
    assert.equal(checkBacktrackingUniqueness(cycle.jigs,size).count,0);
    const cycleResult=checkUniqueness(cycle.jigs,undefined,size);
    assert.equal(cycleResult.count,0);
    assert.equal(cycleResult.usedBacktracking,false);
  });
  test(`Verify's shared logic-first checker solves a unique ${size}x${size} string without search`,()=>{
    const grid=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>(r*(size/3)+Math.floor(r/3)+c)%size+1));
    const parsed=decodeCompactPuzzle(encodeCompactPuzzle(createJigs(grid),size));
    const result=checkUniqueness(parsed.jigs,undefined,parsed.size);
    assert.equal(result.count,1);
    assert.equal(result.usedBacktracking,false);
    assert.ok(result.logicSteps>0);
    assert.deepEqual(result.solutions,[grid.flat()]);
  });
}
test('invalid strings reject incorrect length, characters, and jig orientation',()=>{
  assert.throws(()=>decodeCompactPuzzle(''),/60 characters/);
  assert.throws(()=>decodeCompactPuzzle('x'.repeat(60)),/horizontal/);
  assert.throws(()=>decodeCompactPuzzle('∧'+'0'.repeat(59)),/horizontal/);
  assert.throws(()=>decodeCompactPuzzle('0'.repeat(59)+'<'),/vertical/);
});
const frame=(value:number,candidates:number[]):SolveFrame=>({title:'Test',description:'',values:[value],candidates:[candidates],placements:[],eliminations:[],kind:'logic'});
test('eliminated notes are overlaid for one step only without changing solver state',()=>{
  const before=frame(0,[1,2,3]),current=frame(0,[1,3]),next=frame(0,[1,3]);
  const snapshot=JSON.stringify(current);
  assert.deepEqual(stepNotes(current,before,0),{remaining:[1,3],removed:[2],showNotes:true});
  assert.deepEqual(stepNotes(next,current,0).removed,[]);
  assert.equal(JSON.stringify(current),snapshot);
});
test('a placement immediately displays the full-size number without notes',()=>{
  const before=frame(0,[2,3]),placed=frame(3,[]),next=frame(3,[]);
  assert.deepEqual(stepNotes(placed,before,0),{remaining:[3],removed:[],showNotes:false});
  assert.deepEqual(stepNotes(next,placed,0),{remaining:[3],removed:[],showNotes:false});
});
test('initial notes have no cross-outs',()=>{
  assert.deepEqual(stepNotes(frame(0,[1,2]),undefined,0),{remaining:[1,2],removed:[],showNotes:true});
});
