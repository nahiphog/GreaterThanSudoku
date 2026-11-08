import test from 'node:test';
import assert from 'node:assert/strict';
import { techniqueHighlights, jigHighlights, highlightLookup, houseCells } from './step-highlights';
import { unitsFor } from './six-solver';
import { solvePuzzle } from './difficulty';
import { createJigs } from './sudoku';
import type { SolveFrame } from './logical-solver';
import type { Step } from './techniques';

for(const size of [6,9]){
  const values=Array(size*size).fill(0),candidates=values.map(()=>Array.from({length:size},(_,i)=>i+1));
  const state={values,candidates};
  test(`${size}x${size} highlights retain all structured technique evidence`,()=>{
    for(let u=0;u<size*3;u++)assert.deepEqual(houseCells(u,size),unitsFor(size)[u]);
    const step:Step={tech:'AIC_GROUPED',description:'Fixture',placements:[],eliminations:[{cell:10,digit:2}],
      primary:[{cell:0,digit:1}],secondary:[{cell:1,digit:2}],fins:[{cell:2,digit:3}],labels:{primary:'Base',secondary:'Cover',fins:'Fin'},
      units:[{unit:size*2+1,role:'primary'},{unit:size+2,role:'secondary'}],chainCells:[3],
      links:[{from:[{cell:4,digit:2},{cell:5,digit:2}],to:[{cell:6,digit:3}],strong:true}],
      sets:[{kind:'als',cells:[7,8],digits:[1,2,3],members:[{cell:7,digit:1},{cell:8,digit:3}],unit:0}],
      colouring:{rule:'bridge',clusters:[{dark:[{cell:9,digit:1}],light:[{cell:11,digit:1}]},{dark:[{cell:12,digit:2}],light:[{cell:13,digit:2}]}]}};
    const copy=JSON.stringify(step),groups=techniqueHighlights(step,state,size),lookup=highlightLookup(groups);
    for(const c of [0,1,2,3,4,5,6,7,8,9,11,12,13,...houseCells(size*2+1,size),...houseCells(size+2,size)])assert.ok(lookup.cells.has(c));
    for(const cd of [...step.primary!,...step.secondary!,...step.fins!,...step.links!.flatMap(l=>[...l.from,...l.to]),...step.sets![0].members,...step.colouring!.clusters.flatMap(c=>[...c.dark,...c.light])])assert.ok(lookup.candidates.has(`${cd.cell}:${cd.digit}`));
    assert.equal(lookup.candidates.get('2:3'),'fins');assert.equal(lookup.candidates.get('9:1'),'purple-dark');assert.equal(lookup.candidates.get('12:2'),'orange-dark');
    assert.equal(JSON.stringify(step),copy);
    assert.equal(highlightLookup().cells.size,0);
  });
  test(`${size}x${size} jig and full-house highlights include their evidence`,()=>{
    assert.deepEqual(jigHighlights(0,1,state)[0].candidates.length,size*2);
    const filled={values:[...values],candidates:candidates.map(ds=>[...ds])};
    for(let c=0;c<size-1;c++){filled.values[c]=c+1;filled.candidates[c]=[];}
    const groups=techniqueHighlights({tech:'FULL_HOUSE',placements:[{cell:size-1,digit:size}],eliminations:[],description:'',units:[{unit:0,role:'primary'}]},filled,size);
    assert.equal(groups.flatMap(g=>g.candidates).length,size-1);assert.equal(highlightLookup(groups).cells.size,size);
  });
  test(`${size}x${size} walkthrough carries highlights for every logical step`,()=>{
    const grid=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>(r*(size/3)+Math.floor(r/3)+c)%size+1));
    const frames:SolveFrame[]=[];solvePuzzle(createJigs(grid),size,f=>frames.push(f));
    assert.ok(frames.length>size);
    for(const f of frames.filter(f=>f.kind==='logic')){
      assert.ok(f.highlights?.length, f.title);
      for(const g of f.highlights!)for(const c of g.cells)assert.ok(c>=0&&c<size*size);
      for(const g of f.highlights!)for(const cd of g.candidates)assert.ok(cd.digit>=1&&cd.digit<=size);
    }
    assert.equal(frames[0].highlights,undefined);
  });
}

