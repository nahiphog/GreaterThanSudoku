import test from 'node:test';
import assert from 'node:assert/strict';
import { hardestTechnique } from './generation-summary';

test('hardest technique uses per-use difficulty, includes ties, and ignores unused techniques',()=>{
  const tally=[{name:'Single',count:100,score:10,steps:[]},{name:'Wing',count:1,score:100,steps:[]},{name:'Chain',count:1,score:100,steps:[]},{name:'Brute force',count:0,score:10000,steps:[]}];
  assert.equal(hardestTechnique(tally),'Wing, Chain');
  tally[3].count=1;assert.equal(hardestTechnique(tally),'Brute force');
  assert.equal(hardestTechnique([]),'None');
});
