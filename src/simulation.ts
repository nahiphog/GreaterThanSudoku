import { readMatches } from './simulation-store';
import { renderRating } from './rating-view';
import type { Match } from './simulation.worker';

function preview(string: string,size:number) {
  const board=document.createElement('div');board.className='board';board.dataset.size=String(size);board.setAttribute('role','img');board.setAttribute('aria-label',`${size} by ${size} jig puzzle; full comparisons are in the adjacent puzzle string.`);
  const width=size/3;
  for(let r=0;r<size;r++) for(let c=0;c<size;c++) {
    const cell=document.createElement('span');cell.className=`cell${c%width===width-1&&c<size-1?' box-right':''}${r%3===2&&r<size-1?' box-bottom':''}`;board.append(cell);
  }
  let index=0;
  const mark=(r:number,c:number,vertical:boolean)=>{
    const symbol=string[index++];if(symbol==='0')return;
    const el=document.createElement('span');el.className=`jig ${vertical?'vertical':'horizontal'}`;el.textContent=symbol;
    el.style.left=`${(c+(vertical?.5:1))/size*100}%`;el.style.top=`${(r+(vertical?1:.5))/size*100}%`;board.append(el);
  };
  for(let r=0;r<size;r++)for(let c=0;c<size-1;c++)mark(r,c,false);
  for(let c=0;c<size;c++)for(let r=0;r<size-1;r++)mark(r,c,true);
  return board;
}
export function initSimulation(onStep: (grid: number[][], step: number) => void) {
  const main=document.createElement('main');main.id='simulation-page';main.hidden=true;
  main.innerHTML=`<h1>Simulation difficulty</h1><p>Generate and rate random puzzles. Each trial is checked for uniqueness first. Only verified unique puzzles are rated; other trials are skipped. Ratings use the same solver and scoring as the puzzle maker.</p>
  <form id="simulation-form" class="simulation-controls"><label>Total trials<select name="trials">${[1,10,100,1000,10000,100000,1000000].map(n=>`<option value="${n}" ${n===100?'selected':''}>${n.toLocaleString()}</option>`).join('')}</select></label>
  <label>Grid type<select name="size"><option value="6">6×6</option><option value="9" selected>9×9</option></select></label>
  <label>Display puzzles rated at least<select name="threshold">${[0,500,1000,2000,3000,10000,10000000].map(n=>`<option value="${n}">${n.toLocaleString()}</option>`).join('')}</select></label>
  <button type="submit">Start simulation</button><button id="simulation-stop" type="button" disabled>Stop</button></form>
  <p>Jig strings use 144 characters for 9×9 and 60 for 6×6, with 0 for missing comparisons. Matching puzzles appear below, 10 per page, and are stored in this browser for the current run. Large simulations can take a long time; you can stop at any point.</p>
  <p id="simulation-status" role="status">Ready.</p><div class="simulation-controls"><button id="simulation-prev">Previous matches</button><span id="simulation-page-count"></span><button id="simulation-next">Next matches</button></div><div id="simulation-results"></div>`;
  document.querySelector('footer')!.before(main);
  const route=()=>{const simulation=location.hash==='#simulation';main.hidden=!simulation;document.querySelector<HTMLElement>('#home-page')!.hidden=simulation;document.title=simulation?'Simulation difficulty — Greater than Sudoku':'Greater than Sudoku';};
  window.addEventListener('hashchange',route);route();
  const get=<T extends HTMLElement>(id:string)=>main.querySelector<T>('#'+id)!;
  const form=get<HTMLFormElement>('simulation-form');
  let worker:Worker|undefined,timer=0,started=0,elapsed=0,completed=0,unique=0,skipped=0,total=0,sum=0,min=0,max=0,size=9,page=0;
  let matchCount=0, database='', renderId=0, outcome='Ready.';
  function status(){get('simulation-status').textContent=`${outcome} ${completed.toLocaleString()} / ${total.toLocaleString()} trials. ${unique.toLocaleString()} unique rated; ${skipped.toLocaleString()} skipped. ${matchCount.toLocaleString()} matches. Total elapsed time: ${(elapsed/1000).toFixed(3)} seconds.${unique?` Mean (unique puzzles): ${(sum/unique).toFixed(2)}. Min: ${min}. Max: ${max}.`:''}`;}
  async function render(){
    const requestId=++renderId;
    const pages=Math.max(1,Math.ceil(matchCount/10));page=Math.min(page,pages-1);
    get<HTMLButtonElement>('simulation-prev').disabled=page===0;get<HTMLButtonElement>('simulation-next').disabled=page>=pages-1;
    get('simulation-page-count').textContent=`Page ${page+1} of ${pages}`;
    const results=get('simulation-results');
    const expanded = new Set(Array.from(results.querySelectorAll<HTMLDetailsElement>('details[open]'), detail => Number(detail.dataset.trial)));
    results.replaceChildren();
    let visible:Match[]=[];
    try {if(database && matchCount) visible=await readMatches(database,page);} catch(error) {if(requestId===renderId) results.textContent=String(error);return;}
    if(requestId!==renderId)return;
    for(const match of visible) {
      const card=document.createElement('article');card.className='simulation-card';
      const heading=document.createElement('h2');heading.textContent=`Trial ${match.trial} · Rating ${match.score.toLocaleString()}`;card.append(heading,preview(match.string,size));
      const label=document.createElement('label');label.textContent=`${match.string.length}-character puzzle string`;
      const text=document.createElement('textarea');text.readOnly=true;text.value=match.string;text.rows=3;label.append(text);card.append(label);
      const details=document.createElement('details'),summary=document.createElement('summary'),rating=document.createElement('div');summary.textContent='Technique tally';details.dataset.trial=String(match.trial);details.open=expanded.has(match.trial);renderRating(rating,match.score,match.tally,'Difficulty rating', step => onStep(match.solution, step));details.append(summary,rating);card.append(details);results.append(card);
    }
  }
  function stop(message:string){if(worker){worker.terminate();worker=undefined;elapsed=performance.now()-started}window.clearInterval(timer);outcome=message;get<HTMLButtonElement>('simulation-stop').disabled=true;form.querySelectorAll<HTMLSelectElement>('select').forEach(e=>e.disabled=false);form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=false;status();}
  form.addEventListener('submit',event=>{
    event.preventDefault();stop('');if(database) indexedDB.deleteDatabase(database);database='greater-than-sudoku-simulation-'+Date.now()+'-'+Math.random().toString(36).slice(2);const data=new FormData(form);total=Number(data.get('trials'));size=Number(data.get('size'));const threshold=Number(data.get('threshold'));
    matchCount=0;completed=0;unique=0;skipped=0;sum=0;min=0;max=0;elapsed=0;page=0;outcome='Running.';started=performance.now();render();status();
    form.querySelectorAll<HTMLSelectElement>('select').forEach(e=>e.disabled=true);form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=true;get<HTMLButtonElement>('simulation-stop').disabled=false;
    const active=new Worker(new URL('./simulation.worker.ts',import.meta.url),{type:'module'});worker=active;
    timer=window.setInterval(()=>{elapsed=performance.now()-started;status()},1000);
    active.onmessage=(event:MessageEvent<{completed:number;unique:number;skipped:number;sum:number;min:number;max:number;matchCount:number;done?:boolean;error?:string}>)=>{
      if(worker!==active)return;const d=event.data;completed=d.completed;unique=d.unique;skipped=d.skipped;sum=d.sum;min=d.min;max=d.max;elapsed=performance.now()-started;const oldLength=matchCount;matchCount=d.matchCount;
      // Update only the visible page; never create a DOM grid for every trial.
      if(matchCount>oldLength && (oldLength<10 || page===Math.floor(oldLength/10))) render();
      else {get('simulation-page-count').textContent=`Page ${page+1} of ${Math.max(1,Math.ceil(matchCount/10))}`;get<HTMLButtonElement>('simulation-next').disabled=page>=Math.ceil(matchCount/10)-1;}
      if(d.error)stop('Stopped: '+d.error);else if(d.done)stop('Completed.');else status();
    };
    active.onerror=()=>{if(worker===active)stop('Simulation failed. Partial results retained.')};active.postMessage({trials:total,size,threshold,database});
  });
  window.addEventListener('pagehide',()=>{worker?.terminate();if(database)indexedDB.deleteDatabase(database)});
  get('simulation-stop').addEventListener('click',()=>stop('Stopped. Partial results retained.'));
  get('simulation-prev').addEventListener('click',()=>{page--;render()});get('simulation-next').addEventListener('click',()=>{page++;render()});render();
}
