import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCompactPuzzle, encodeCompactPuzzle } from './compact';
import { generateSolution, createJigs } from './sudoku';
import { checkBacktrackingUniqueness } from './backtracking-uniqueness';
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
    const cycle=decodeCompactPuzzle(encodeCompactPuzzle([
      {row:0,col:0,direction:'horizontal',symbol:'<'},
      {row:0,col:1,direction:'vertical',symbol:'∧'},
      {row:1,col:0,direction:'horizontal',symbol:'>'},
      {row:0,col:0,direction:'vertical',symbol:'v'},
    ],size));
    assert.equal(checkBacktrackingUniqueness(cycle.jigs,size).count,0);
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
test('a placement displays crossed-out alternative notes only on its own step',()=>{
  const before=frame(0,[2,3]),placed=frame(3,[]),next=frame(3,[]);
  assert.deepEqual(stepNotes(placed,before,0),{remaining:[3],removed:[2],showNotes:true});
  assert.deepEqual(stepNotes(next,placed,0),{remaining:[3],removed:[],showNotes:false});
});
test('initial notes have no cross-outs',()=>{
  assert.deepEqual(stepNotes(frame(0,[1,2]),undefined,0),{remaining:[1,2],removed:[],showNotes:true});
});
