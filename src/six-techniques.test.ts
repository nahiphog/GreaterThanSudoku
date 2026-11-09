import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGrid, bit, setValue, UNITS, PEERS, boxOf } from './vendor/sudokui-six/board';
import { findStep } from './vendor/sudokui-six/humanSolver';
import { findTurbotFamily, findEmptyRectangle } from './vendor/sudokui-six/techniques/singleDigit';
import { SIX_LOGIC_ORDER, unitsFor } from './six-solver';
import { LOGIC_ORDER, DISABLED_TECHNIQUES, nextEnabledStep, type SolveFrame } from './logical-solver';
import { decodeCompactPuzzle } from './compact';
import { solvePuzzle, ratePuzzle } from './difficulty';
import { checkBacktrackingUniqueness } from './backtracking-uniqueness';
import { checkUniqueness } from './uniqueness';
import { TECHS } from './techniques';

const puzzle='>0<0><0>0<<0<0<>0>0><0>0<>0<0>∧v0v∧∧v0vvvv0∧vv∧0∧∧v∧0v∧∧∧0∧v';
function beforeOldFallback() {
  const notes=['234','123','5','6','34','12','5','6','34','12','12','34','123','234','12','34','5','6','6','5','234','12','34','123','12','34','6','34','12','5','34','12','1234','5','6','1234'];
  const g=emptyGrid();
  notes.forEach((ds,c)=>{if(ds.length===1){g.values[c]=Number(ds);g.cands[c]=0;}else g.cands[c]=[...ds].reduce((m,d)=>m|bit(Number(d)),0);});
  return g;
}
test('adapted geometry has six 3-row by 2-column regions and correct peers',()=>{
  assert.deepEqual(UNITS,unitsFor(6));
  for(let c=0;c<36;c++) {
    assert.equal(boxOf(c),Math.floor(c/18)*3+Math.floor(c%6/2));
    assert.deepEqual(new Set(PEERS[c]),new Set(UNITS.filter(u=>u.includes(c)).flat().filter(p=>p!==c)));
  }
});
test('6x6 enables every applicable active 9x9 technique and preserves all exclusions',()=>{
  assert.deepEqual(SIX_LOGIC_ORDER,LOGIC_ORDER.filter(t=>t!=='WHALE'&&t!=='LEVIATHAN'));
  for(const t of SIX_LOGIC_ORDER){assert.ok(!DISABLED_TECHNIQUES.has(t));assert.notEqual(TECHS[t].category,'Uniqueness');}
});
test('Skyscraper independently eliminates 4 from R1C5 in the reported position',()=>{
  const step=findTurbotFamily(beforeOldFallback(),'SKYSCRAPER',4);
  assert.ok(step?.eliminations.some(e=>e.cell===4&&e.digit===4));
  assert.deepEqual(step.primary?.map(e=>e.cell),[8,11,20,22]);
});
test('Empty Rectangle independently eliminates 4 from R1C5 using the bottom-right box',()=>{
  const step=findEmptyRectangle(beforeOldFallback(),4,4);
  assert.ok(step?.eliminations.some(e=>e.cell===4&&e.digit===4));
  assert.deepEqual(step.secondary?.map(e=>e.cell),[30,0]);
});
test('reported puzzle is uniquely solved without backtracking and rates 524',()=>{
  const {jigs,size}=decodeCompactPuzzle(puzzle), independent=checkBacktrackingUniqueness(jigs,size);
  assert.equal(independent.count,1);
  const check=checkUniqueness(jigs,undefined,size);assert.equal(check.count,1);assert.equal(check.usedBacktracking,false);
  const frames:SolveFrame[]=[];
  const result=solvePuzzle(jigs,size,f=>frames.push(f));assert.equal(result.bruteForceUses,0);
  assert.equal(frames[17].title,'Remote Pair');assert.equal(frames.length-1,44);
  for(const f of frames)independent.solutions[0].forEach((d,c)=>assert.ok(f.values[c]===d||!f.values[c]&&f.candidates[c].includes(d)));
  assert.deepEqual(frames.at(-1)!.values,independent.solutions[0]);
  assert.equal(ratePuzzle(jigs,size).score,524);
});
test('every active adapted finder preserves a known completion in 100 deterministic candidate states',()=>{
  let seed=72913;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let deductions=0;
  for(let trial=0;trial<100;trial++) {
    const digits=[1,2,3,4,5,6];for(let i=5;i>0;i--){const j=Math.floor(random()*(i+1));[digits[i],digits[j]]=[digits[j],digits[i]];}
    const solution=Array.from({length:36},(_,c)=>digits[(Math.floor(c/6)*2+Math.floor(c/18)+c%6)%6]);
    const g=emptyGrid();
    for(let c=0;c<36;c++)if(random()<trial%5/10)setValue(g,c,solution[c]);
    for(let c=0;c<36;c++)if(!g.values[c])for(let d=1;d<=6;d++)if(d!==solution[c]&&random()<0.5)g.cands[c]&=~bit(d);
    for(const tech of SIX_LOGIC_ORDER) {
      const step=nextEnabledStep([tech],key=>findStep(key,g));if(!step)continue;deductions++;
      assert.ok(!DISABLED_TECHNIQUES.has(step.tech),step.tech);
      for(const {cell,digit} of step.eliminations){assert.ok(cell>=0&&cell<36&&digit>=1&&digit<=6,tech);assert.notEqual(solution[cell],digit,`${tech} trial ${trial} cell ${cell}`);}
      for(const {cell,digit} of step.placements)assert.equal(solution[cell],digit,`${tech} trial ${trial} cell ${cell}`);
    }
  }
  assert.ok(deductions>100);
});
