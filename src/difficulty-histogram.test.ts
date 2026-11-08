import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDifficultyHistogram,recordDifficulty,difficultyHistogramSvg} from './difficulty-histogram';

test('difficulty bins preserve all ratings at boundaries and when expanding',()=>{
  const h=createDifficultyHistogram();
  assert.match(difficultyHistogramSvg(h),/Waiting for completed puzzles/);
  const scores=[0,499,500,9999,10000,40500,10000000];
  for(const score of scores)recordDifficulty(h,score);
  const expected=Array(20).fill(0);
  for(const score of scores)expected[Math.floor(score/h.width)]++;
  assert.deepEqual(h.counts,expected);
  assert.equal(h.counts.reduce((a,b)=>a+b,0),scores.length);
  assert.match(difficultyHistogramSvg(h),/Difficulty rating/);
  assert.doesNotMatch(difficultyHistogramSvg(h),/Remaining jigs|NaN|Infinity/);
  assert.throws(()=>recordDifficulty(h,-1));
  assert.throws(()=>recordDifficulty(h,Infinity));
  assert.equal(createDifficultyHistogram().counts.reduce((a,b)=>a+b,0),0);
});
test('difficulty worker updates after each unique rating even outside the display filter',async()=>{
  const messages:any[]=[];
  const previousSelf=Object.getOwnPropertyDescriptor(globalThis,'self'),random=Math.random;
  const worker={onmessage:undefined as any,postMessage:(data:any)=>messages.push(structuredClone(data))};
  Object.defineProperty(globalThis,'self',{value:worker,configurable:true});
  try{
    await import('./simulation.worker');
    for(const size of [6,9]){
      messages.length=0;Math.random=()=>0.5;
      await worker.onmessage({data:{trials:2,size,threshold:10000000,database:'difficulty-histogram-'+size,mode:'difficulty',dig:false}});
      assert.equal(messages.length,2);
      for(let i=0;i<2;i++){
        const m=messages[i];assert.equal(m.error,undefined);assert.equal(m.unique,size===6?i+1:0);assert.equal(m.skipped,size===6?0:i+1);assert.equal(m.matchCount,0);
        assert.equal(m.difficultyHistogram.counts.reduce((a:number,b:number)=>a+b,0),size===6?i+1:0);
        assert.equal(m.jigHistogram,undefined);
      }
      assert.equal(messages[0].done,false);assert.equal(messages[1].done,true);
    }
  }finally{
    Math.random=random;if(previousSelf)Object.defineProperty(globalThis,'self',previousSelf);else Reflect.deleteProperty(globalThis,'self');
    for(const size of [6,9])indexedDB.deleteDatabase('difficulty-histogram-'+size);
  }
});
