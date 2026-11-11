import test from 'node:test';
import assert from 'node:assert/strict';
import {createJigs,generateSolution} from './sudoku';
import {checkUniqueness} from './uniqueness';

test('Generate worker retries non-unique candidates and publishes only a unique result for both sizes',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'self'),random=Math.random;
  const messages:any[]=[];
  let seed=12345;
  const seeded=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const worker={onmessage:undefined as any,postMessage:(data:any)=>{
    messages.push(structuredClone(data));
    if(data.type==='progress')Math.random=data.attempts===1?()=>0:seeded;
  }};
  Object.defineProperty(globalThis,'self',{value:worker,configurable:true});
  try{
    await import('./digging.worker');
    for(const size of [6,9]){
      Math.random=()=>0;
      assert.equal(checkUniqueness(createJigs(generateSolution(size)),undefined,size).count,2);
      messages.length=0;seed=12345;
      worker.onmessage({data:{size,dig:false}});
      const results=messages.filter(m=>m.type==='result');
      assert.equal(results.length,1);assert.equal(messages.at(-1).type,'result');
      const result=results[0];assert.ok(result.attempts>1);
      assert.equal(messages.filter(m=>m.type==='progress').length,result.attempts);
      assert.equal(result.jigs.length,size===6?42:108);
      const verified=checkUniqueness(result.jigs,undefined,size);
      assert.equal(verified.count,1);assert.deepEqual(verified.solutions[0],result.grid.flat());
    }
  }finally{Math.random=random;if(descriptor)Object.defineProperty(globalThis,'self',descriptor);else Reflect.deleteProperty(globalThis,'self');}
});
