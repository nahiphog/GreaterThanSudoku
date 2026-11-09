import { createDifficultyHistogram, renderDifficultyHistogram, type DifficultyHistogram } from './difficulty-histogram';
import { createJigHistogram, renderJigHistogram } from './jig-histogram';
import { decodeCompactPuzzle } from './compact';
import { puzzleBoard } from './board-view';
import { copyPuzzleText, copyPuzzleImage, puzzlePng } from './puzzle-image';
import { readMatches } from './simulation-store';
import { renderRating } from './rating-view';
import type { SimulationMode } from './simulation-trial';
import type { Match } from './simulation.worker';

export function initSimulation(onStep: (grid: number[][], step: number, string:string) => void, mode:SimulationMode='difficulty') {
  const isJigs=mode==='jigs', prefix=isJigs?'jig-simulation':'simulation';
  const main=document.createElement('main');main.id=isJigs?'simulation-jigs-page':'simulation-page';main.hidden=true;
  main.innerHTML=`<h1>${isJigs?'Simulation jigs':'Simulation difficulty'}</h1>
  <form id="simulation-form" class="simulation-controls"><label>Total trials<select name="trials">${[1,10,100,1000,10000,100000,1000000].map(n=>`<option value="${n}" ${n===100?'selected':''}>${n.toLocaleString()}</option>`).join('')}</select></label>
  <label>Grid type<select name="size"><option value="6">6x6</option><option value="9" selected>9x9</option></select></label>
  <label>${isJigs?'Display puzzles with at most X jigs':'Display puzzles rated at least'}<select name="threshold">${(isJigs?Array.from({length:108},(_,i)=>i+1):[0,500,1000,2000,3000,10000,10000000]).map(n=>`<option value="${n}" ${isJigs&&n===108?'selected':''}>${n.toLocaleString()}</option>`).join('')}</select></label>
  <label class="simulation-dig"><input type="checkbox" name="dig" ${isJigs?'checked disabled':''}> Dig out jigs while preserving uniqueness</label>
  <label>Digging method<select name="method" ${isJigs?'':'disabled'}><option value="single">Single jig</option><option value="rotational">Rotational pairs (180°)</option></select></label>
  <button type="submit">Start simulation</button><button id="simulation-stop" type="button" disabled>Stop</button></form>

  <p id="simulation-status" role="status">Ready.</p><section id="simulation-histogram" class="jig-histogram"></section><div class="simulation-controls"><button id="simulation-prev">Previous matches</button><span id="simulation-page-count"></span><button id="simulation-next">Next matches</button></div><div id="simulation-results"></div>`;
  main.querySelectorAll<HTMLElement>('[id]').forEach(el=>el.id=el.id.replace('simulation',prefix));
  main.querySelector('[id$=results]')!.classList.add('simulation-results');
  document.querySelector('footer')!.before(main);
  const get=<T extends HTMLElement>(id:string)=>main.querySelector<T>('#'+id.replace('simulation',prefix))!;
  const form=get<HTMLFormElement>('simulation-form');
  const methodSelect=form.querySelector<HTMLSelectElement>('[name=method]')!;
  const digCheckbox=form.querySelector<HTMLInputElement>('[name=dig]')!;
  digCheckbox.addEventListener('change',()=>{methodSelect.disabled=!digCheckbox.checked;});
  let worker:Worker|undefined,timer=0,started=0,elapsed=0,completed=0,unique=0,skipped=0,total=0,sum=0,min=0,max=0,size=9,page=0;
  let dig=isJigs;
  if(isJigs)renderJigHistogram(get('simulation-histogram'),createJigHistogram(size));
  else renderDifficultyHistogram(get('simulation-histogram'),createDifficultyHistogram());
  let matchCount=0, database='', renderId=0, outcome='Ready.';
  function status(){get('simulation-status').textContent=`${outcome} ${completed.toLocaleString()} / ${total.toLocaleString()} trials. ${unique.toLocaleString()} unique ${isJigs?'counted':'rated'}; ${skipped.toLocaleString()} skipped. ${matchCount.toLocaleString()} matches. Total elapsed time: ${(elapsed/1000).toFixed(3)} seconds.${unique?` Mean ${isJigs?'jig count':'difficulty'} (unique puzzles): ${(sum/unique).toFixed(2)}. Min: ${min}. Max: ${max}.`:''}`;}
  async function render(){
    const requestId=++renderId;
    const pages=Math.max(1,Math.ceil(matchCount/10));page=Math.min(page,pages-1);
    get<HTMLButtonElement>('simulation-prev').disabled=page===0;get<HTMLButtonElement>('simulation-next').disabled=page>=pages-1;
    get('simulation-page-count').textContent=`Page ${page+1} of ${pages}`;
    const results=get('simulation-results');
    const expanded = new Set(Array.from(results.querySelectorAll<HTMLDetailsElement>('details[open]'), detail => Number(detail.dataset.trial)));
    results.replaceChildren();
    let visible:Match[]=[];
    try {if(database && matchCount) visible=await readMatches(database,page,isJigs?'jigs':'trial');} catch(error) {if(requestId===renderId) results.textContent=String(error);return;}
    if(requestId!==renderId)return;
    for(const match of visible) {
      const card=document.createElement('article');card.className='simulation-card';
      const heading=document.createElement('h2');heading.textContent=`Trial ${match.trial} · ${match.jigCount} jigs${isJigs?'':' · Rating '+match.score!.toLocaleString()}`;card.append(heading,puzzleBoard(decodeCompactPuzzle(match.string).jigs,size));
      const timing=document.createElement('p');timing.textContent='Elapsed time for this puzzle: '+(match.elapsedMs/1000).toFixed(3)+` seconds (generation, uniqueness check${dig?', digging':''}${isJigs?'':', rating'}).`;card.append(timing);
      const actions=document.createElement('div');actions.className='simulation-card-actions';
      const copyString=document.createElement('button');copyString.type='button';copyString.textContent='Copy puzzle string';
      const copyImage=document.createElement('button');copyImage.type='button';copyImage.textContent='Copy grid as image';
      const feedback=document.createElement('p');feedback.className='copy-status';feedback.setAttribute('role','status');
      copyString.addEventListener('click',async()=>{try{await copyPuzzleText(match.string);feedback.textContent='Copied all '+match.string.length+' characters.'}catch{feedback.textContent='Clipboard access was blocked. Please allow clipboard access and try again.'}});
      copyImage.addEventListener('click',async()=>{
        try{await copyPuzzleImage(match.string);feedback.textContent='Grid image copied as PNG.'}
        catch{feedback.textContent='Image clipboard access is unavailable. ';const download=document.createElement('button');download.type='button';download.textContent='Download PNG instead';download.addEventListener('click',async()=>{try{const blob=await puzzlePng(match.string);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='greater-than-sudoku-trial-'+match.trial+'.png';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{feedback.textContent='Unable to create the PNG image.'}});feedback.append(download)}
      });
      actions.append(copyString,copyImage);card.append(actions,feedback);
      if(!isJigs && match.score!==undefined && match.tally){
      const details=document.createElement('details'),summary=document.createElement('summary'),rating=document.createElement('div');summary.textContent='Technique tally';details.dataset.trial=String(match.trial);details.open=expanded.has(match.trial);renderRating(rating,match.score,match.tally,'Difficulty rating', step => onStep(match.solution, step, match.string));details.append(summary,rating);card.append(details);}
      results.append(card);
    }
  }
  function stop(message:string){if(worker){worker.terminate();worker=undefined;elapsed=performance.now()-started}window.clearInterval(timer);outcome=message;get<HTMLButtonElement>('simulation-stop').disabled=true;form.querySelectorAll<HTMLSelectElement|HTMLInputElement>('select,input').forEach(e=>e.disabled=(isJigs && e.name==='dig') || (e.name==='method' && !digCheckbox.checked));form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=false;status();}
  form.addEventListener('submit',event=>{
    event.preventDefault();stop('');if(database) indexedDB.deleteDatabase(database);database='greater-than-sudoku-simulation-'+Date.now()+'-'+Math.random().toString(36).slice(2);const data=new FormData(form);total=Number(data.get('trials'));size=Number(data.get('size'));const threshold=Number(data.get('threshold'));dig=isJigs || data.has('dig');const method=methodSelect.value;
    if(isJigs)renderJigHistogram(get('simulation-histogram'),createJigHistogram(size));
  else renderDifficultyHistogram(get('simulation-histogram'),createDifficultyHistogram());
    matchCount=0;completed=0;unique=0;skipped=0;sum=0;min=0;max=0;elapsed=0;page=0;outcome='Running.';started=performance.now();render();status();
    form.querySelectorAll<HTMLSelectElement|HTMLInputElement>('select,input').forEach(e=>e.disabled=true);form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled=true;get<HTMLButtonElement>('simulation-stop').disabled=false;
    const active=new Worker(new URL('./simulation.worker.ts',import.meta.url),{type:'module'});worker=active;
    timer=window.setInterval(()=>{elapsed=performance.now()-started;status()},1000);
    active.onmessage=(event:MessageEvent<{difficultyHistogram?:DifficultyHistogram;jigHistogram?:number[];completed:number;unique:number;skipped:number;sum:number;min:number;max:number;matchCount:number;done?:boolean;error?:string}>)=>{
      if(worker!==active)return;const d=event.data;completed=d.completed;unique=d.unique;skipped=d.skipped;sum=d.sum;min=d.min;max=d.max;elapsed=performance.now()-started;const oldLength=matchCount;matchCount=d.matchCount;
      if(!isJigs && d.difficultyHistogram)renderDifficultyHistogram(get('simulation-histogram'),d.difficultyHistogram);
      if(isJigs && d.jigHistogram)renderJigHistogram(get('simulation-histogram'),d.jigHistogram);
      // New jig-count matches can move into any sorted page. Render only that page.
      if(matchCount>oldLength && (isJigs || oldLength<10 || page===Math.floor(oldLength/10))) render();
      else {get('simulation-page-count').textContent=`Page ${page+1} of ${Math.max(1,Math.ceil(matchCount/10))}`;get<HTMLButtonElement>('simulation-next').disabled=page>=Math.ceil(matchCount/10)-1;}
      if(d.error)stop('Stopped: '+d.error);else if(d.done)stop('Completed.');else status();
    };
    active.onerror=()=>{if(worker===active)stop('Simulation failed. Partial results retained.')};active.postMessage({trials:total,size,threshold,database,mode,dig,method});
  });
  window.addEventListener('pagehide',()=>{worker?.terminate();if(database)indexedDB.deleteDatabase(database)});
  get('simulation-stop').addEventListener('click',()=>stop('Stopped. Partial results retained.'));
  get('simulation-prev').addEventListener('click',()=>{page--;render()});get('simulation-next').addEventListener('click',()=>{page++;render()});render();
}
