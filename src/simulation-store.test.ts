import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openMatches, saveMatches, readMatches } from './simulation-store';
import type { Match } from './simulation.worker';

const match=(trial:number,jigCount:number):Match=>({trial,jigCount,elapsedMs:1,solution:[],string:''});
test('jig results sort globally across pages with stable ties and new arrivals',async()=>{
  const name='sorted-jigs',db=await openMatches(name);
  try {
    const rows=Array.from({length:25},(_,i)=>match(i+1,30-i%13));
    await saveMatches(db,rows,0);
    const expected=[...rows].sort((a,b)=>a.jigCount-b.jigCount||a.trial-b.trial);
    for(let page=0;page<3;page++)assert.deepEqual((await readMatches(name,page,'jigs')).map(m=>m.trial),expected.slice(page*10,page*10+10).map(m=>m.trial));
    assert.deepEqual(await readMatches(name,3,'jigs'),[]);
    // A low-count match arriving after page one filled must appear first.
    await saveMatches(db,[match(26,1)],25);
    assert.equal((await readMatches(name,0,'jigs'))[0].trial,26);
    assert.deepEqual((await readMatches(name,1,'jigs')).map(m=>m.trial),[...expected].slice(9,19).map(m=>m.trial));
    // Difficulty simulations retain their existing generation order.
    assert.deepEqual((await readMatches(name,0)).map(m=>m.trial),rows.slice(0,10).map(m=>m.trial));
  } finally {db.close();indexedDB.deleteDatabase(name);}
});
test('existing simulation stores upgrade without losing their matches',async()=>{
  const name='legacy-simulation';
  const old=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('matches',{keyPath:'index'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  await saveMatches(old,[match(1,25),match(2,10)],0);old.close();
  assert.deepEqual((await readMatches(name,0,'jigs')).map(m=>m.trial),[2,1]);
  indexedDB.deleteDatabase(name);
});
