import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createJigHistogram,recordJigCount,histogramSvg} from './jig-histogram';

test('histogram records each count and renders vertical bars with exact labels',()=>{
  for(const size of [6,9]){
    const bins=createJigHistogram(size);assert.equal(bins.length,size===6?43:109);
    assert.match(histogramSvg(bins),/Waiting for completed puzzles/);
    for(const count of [12,12,18])recordJigCount(bins,count);
    assert.equal(bins[12],2);assert.equal(bins[18],1);assert.equal(bins.reduce((a,b)=>a+b,0),3);
    const svg=histogramSvg(bins);assert.equal((svg.match(/<rect /g)??[]).length,2);
    assert.match(svg,/12 jigs: 2 puzzles/);assert.match(svg,/Remaining jigs/);assert.match(svg,/Number of puzzles/);
    assert.doesNotMatch(svg,/NaN|Infinity/);
    bins[12]=1000000;assert.doesNotMatch(histogramSvg(bins),/NaN|Infinity/);
    assert.throws(()=>recordJigCount(bins,bins.length));
  }
});
test('worker publishes live histogram counts even when all puzzles are filtered out, and resets each run',async()=>{
  const messages:any[]=[];
  const previousSelf=Object.getOwnPropertyDescriptor(globalThis,'self'),random=Math.random;
  const worker={onmessage:undefined as any,postMessage:(data:any)=>messages.push(structuredClone(data))};
  Object.defineProperty(globalThis,'self',{value:worker,configurable:true});
  try{
    await import('./simulation.worker');
    Math.random=()=>0.5;
    await worker.onmessage({data:{trials:2,size:6,threshold:1,database:'histogram-test',mode:'jigs'}});
    assert.equal(messages.length,2);
    for(let i=0;i<2;i++){
      const m=messages[i];assert.equal(m.error,undefined);assert.equal(m.unique,i+1);assert.equal(m.matchCount,0);
      assert.equal(m.jigHistogram.reduce((a:number,b:number)=>a+b,0),i+1);
      assert.equal(m.jigHistogram.reduce((sum:number,n:number,jigs:number)=>sum+n*jigs,0),m.sum);
    }
    assert.equal(messages[0].done,false);assert.equal(messages[1].done,true);
    messages.length=0;Math.random=()=>0;
    await worker.onmessage({data:{trials:1,size:6,threshold:108,database:'histogram-reset',mode:'jigs'}});
    assert.equal(messages.at(-1).unique,0);assert.equal(messages.at(-1).skipped,1);
    assert.equal(messages.at(-1).jigHistogram.reduce((a:number,b:number)=>a+b,0),0);
  }finally{
    Math.random=random;if(previousSelf)Object.defineProperty(globalThis,'self',previousSelf);else Reflect.deleteProperty(globalThis,'self');
    indexedDB.deleteDatabase('histogram-test');indexedDB.deleteDatabase('histogram-reset');
  }
});
