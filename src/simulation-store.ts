import type { Match } from './simulation.worker';
export function openMatches(name:string):Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(name,2);
    request.onupgradeneeded=()=>{
      const store=request.result.objectStoreNames.contains('matches')
        ? request.transaction!.objectStore('matches')
        : request.result.createObjectStore('matches',{keyPath:'index'});
      store.createIndex('jig-count',['jigCount','index']);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('Browser storage is unavailable for simulation results.'));
  });
}
export function saveMatches(db:IDBDatabase,matches:Match[],offset:number):Promise<void> {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('matches','readwrite');const store=tx.objectStore('matches');
    matches.forEach((match,i)=>store.put({...match,index:offset+i}));
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Unable to save more matches. Browser storage may be full.'));tx.onabort=()=>reject(new Error('Saving simulation matches was interrupted.'));
  });
}
export async function readMatches(name:string,page:number,order:'trial'|'jigs'='trial'):Promise<Match[]> {
  const db=await openMatches(name);
  try { return await new Promise((resolve,reject)=>{
    if(order==='jigs') {
      // Page through the global index, with generation order breaking ties.
      const request=db.transaction('matches').objectStore('matches').index('jig-count').openCursor();
      const matches:Match[]=[];
      let skip=page*10;
      request.onsuccess=()=>{
        const cursor=request.result;
        if(!cursor){resolve(matches);return;}
        if(skip){const count=skip;skip=0;cursor.advance(count);return;}
        matches.push(cursor.value);
        if(matches.length===10)resolve(matches);else cursor.continue();
      };
      request.onerror=()=>reject(new Error('Unable to read simulation matches.'));
      return;
    }
    const request=db.transaction('matches').objectStore('matches').getAll(IDBKeyRange.bound(page*10,page*10+9));
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Unable to read simulation matches.'));
  }); } finally {db.close()}
}
