import test from 'node:test';
import assert from 'node:assert/strict';
import { borderPositions, customJigs, parseLayout } from './custom-layout';
import { encodeCompactPuzzle, decodeCompactPuzzle } from './compact';
import { generateSolution } from './sudoku';
import { checkUniqueness } from './uniqueness';
import { ratePuzzle } from './difficulty';
for(const size of [6,9]){
  test(`custom ${size}x${size} layouts preserve every selected edge in compact order`,()=>{
    const positions=borderPositions(size),grid=generateSolution(size);
    assert.equal(positions.length,2*size*(size-1));
    for(const [i,p] of positions.entries()){
      const selected=positions.map((_,j)=>i===j),jigs=customJigs(grid,selected);
      assert.equal(jigs.length,1);assert.equal(jigs[0].row,p.row);assert.equal(jigs[0].col,p.col);
      const text=encodeCompactPuzzle(jigs,size);
      assert.notEqual(text[i],'0');assert.equal([...text].filter(c=>c!=='0').length,1);
    }
    assert.deepEqual(parseLayout(' '+ '1'.repeat(positions.length)+'\n',size),positions.map(()=>true));
    assert.throws(()=>parseLayout('0',size));assert.throws(()=>parseLayout('x'.repeat(positions.length),size));
  });
  test(`custom ${size}x${size} result is unique, logically solved and exportable`,()=>{
    const grid=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>(r*(size/3)+Math.floor(r/3)+c)%size+1));
    const jigs=customJigs(grid,borderPositions(size).map(()=>true));
    const parsed=decodeCompactPuzzle(encodeCompactPuzzle(jigs,size));
    const result=checkUniqueness(parsed.jigs,undefined,size);
    assert.equal(result.count,1);assert.deepEqual(result.solutions[0],grid.flat());
    assert.equal(ratePuzzle(parsed.jigs,size).usedBacktracking,false);
  });
}
