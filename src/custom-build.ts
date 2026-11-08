import { borderPositions, parseLayout } from './custom-layout';
import { decodeCompactPuzzle } from './compact';
import { puzzleBoard } from './board-view';
import { copyPuzzleText, copyPuzzleImage } from './puzzle-image';
import { createSolverView } from './solver-view';
import { renderRating } from './rating-view';
import type { Tally } from './difficulty';

export function initCustomBuild(){
  const main=document.createElement('main');main.id='custom-build-page';main.hidden=true;
  main.innerHTML=`<h1>Custom build</h1><p>Select the borders where jigs may appear, then build a unique puzzle solved by logical techniques within your difficulty range.</p>
  <fieldset id="custom-settings"><legend>Puzzle layout</legend><div class="custom-controls"><label>Grid type <select id="custom-size"><option value="6">6x6</option><option value="9" selected>9x9</option></select></label><label>Random border count <input id="custom-count" type="number" min="1" max="144" value="108"></label><button id="custom-random" type="button">Place randomly</button><button id="custom-clear" type="button">Clear borders</button><button id="custom-standard" type="button">Standard region borders</button></div>
  <p id="custom-selected" role="status"></p><div id="custom-editor"></div>
  <label for="custom-layout">Border layout (0 = empty, 1 = selected)</label><textarea id="custom-layout" rows="3" spellcheck="false"></textarea><p id="custom-layout-help"></p><div class="custom-controls"><button id="custom-import" type="button">Import layout</button><button id="custom-export" type="button">Export &amp; copy layout</button></div><p id="custom-layout-status" role="status"></p>
  <div class="custom-controls"><label>Difficulty from <select id="custom-min">${[0,500,800,1000,1200,1400,1800].map(n=>`<option>${n}</option>`).join('')}</select></label><label>Difficulty to <select id="custom-max">${[500,1000,2000,3000,1000000].map(n=>`<option ${n===2000?'selected':''}>${n}</option>`).join('')}</select></label></div></fieldset>
  <button id="custom-build" type="button" disabled>Build now</button><p id="custom-status" role="status">Select at least one border to start.</p>
  <section id="custom-result" hidden><h2>Final puzzle</h2><div id="custom-puzzle"></div><div class="copy-actions"><button id="custom-copy" type="button">Copy puzzle string</button><button id="custom-image" type="button">Copy grid as an image</button></div><p id="custom-copy-status" role="status"></p><div id="custom-rating"></div><div id="custom-walkthrough"></div><details><summary>Completed Sudoku</summary><div id="custom-solution"></div><button id="custom-copy-solution" type="button">Copy completed grid string</button></details></section>`;
  document.querySelector('footer')!.before(main);
  const get=<T extends HTMLElement>(id:string)=>main.querySelector<T>('#custom-'+id)!;
  const solver=createSolverView(()=>{}, {host:get('walkthrough'),prefix:'custom-'});
  let size=9,selected=Array<boolean>(144).fill(false),worker:Worker|undefined,timer=0,started=0,attempts=0,resultString='',solutionString='';
  function invalidate(){get('result').hidden=true;resultString='';solutionString='';solver.reset([],size);get('copy-status').textContent='';}
  function status(message:string){get('status').textContent=`${message} Attempts: ${attempts}. Total elapsed time: ${((performance.now()-started)/1000).toFixed(3)} seconds.`;}
  function stop(){worker?.terminate();worker=undefined;window.clearInterval(timer);get<HTMLFieldSetElement>('settings').disabled=false;get('build').textContent='Build now';get<HTMLButtonElement>('build').disabled=!selected.some(Boolean);}
  function render(){
    const board=puzzleBoard([],size);board.classList.add('custom-editor-board');board.setAttribute('role','group');board.setAttribute('aria-label','Select jig border positions');
    borderPositions(size).forEach((p,i)=>{
      const b=document.createElement('button');b.type='button';b.className='border-toggle'+(selected[i]?' selected':'');b.dataset.index=String(i);
      b.style.left=`${(p.col+(p.direction==='horizontal'?1:.5))/size*100}%`;b.style.top=`${(p.row+(p.direction==='vertical'?1:.5))/size*100}%`;
      const a=`R${p.row+1}C${p.col+1}`,z=`R${p.row+(p.direction==='vertical'?2:1)}C${p.col+(p.direction==='horizontal'?2:1)}`;
      b.setAttribute('aria-label',`Toggle border ${a}–${z}`);b.setAttribute('aria-pressed',String(selected[i]));
      b.addEventListener('click',()=>{selected[i]=!selected[i];invalidate();b.classList.toggle('selected',selected[i]);b.setAttribute('aria-pressed',String(selected[i]));updateCount();});board.append(b);
    });
    get('editor').replaceChildren(board);updateCount();get('layout-help').textContent=`${selected.length} characters: first ${selected.length/2} horizontal borders in row order, then vertical borders in column order. Borders across regions are allowed.`;
  }
  function updateCount(){get('selected').textContent=`${selected.filter(Boolean).length} / ${selected.length} border positions selected`;get<HTMLButtonElement>('build').disabled=!selected.some(Boolean);}
  get('size').addEventListener('change',()=>{size=Number(get<HTMLSelectElement>('size').value);selected=Array(2*size*(size-1)).fill(false);get<HTMLInputElement>('count').max=String(selected.length);get<HTMLInputElement>('count').value=String(size===6?42:108);get<HTMLTextAreaElement>('layout').value='';get('layout-status').textContent='';invalidate();render();});
  get('clear').addEventListener('click',()=>{selected.fill(false);invalidate();render();});
  get('standard').addEventListener('click',()=>{selected=borderPositions(size).map(p=>p.direction==='horizontal'?(p.col+1)%(size/3)!==0:(p.row+1)%3!==0);invalidate();render();});
  get('random').addEventListener('click',()=>{
    const count=Math.min(selected.length,Math.max(1,Math.floor(Number(get<HTMLInputElement>('count').value)||1)));get<HTMLInputElement>('count').value=String(count);
    const positions=selected.map((_,i)=>i);for(let i=positions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
    selected.fill(false);positions.slice(0,count).forEach(i=>selected[i]=true);invalidate();render();
  });
  get('import').addEventListener('click',()=>{try{selected=parseLayout(get<HTMLTextAreaElement>('layout').value,size);invalidate();render();get('layout-status').textContent='Layout imported.';}catch(e){get('layout-status').textContent=(e as Error).message;}});
  get('export').addEventListener('click',async()=>{const text=selected.map(x=>x?'1':'0').join('');get<HTMLTextAreaElement>('layout').value=text;try{await copyPuzzleText(text);get('layout-status').textContent='Layout copied.';}catch{get('layout-status').textContent='Layout is available in the text box; clipboard access was blocked.';}});
  get('build').addEventListener('click',()=>{
    if(worker){stop();status('Build halted.');return;}
    invalidate();attempts=0;started=performance.now();get<HTMLFieldSetElement>('settings').disabled=true;get('build').textContent='Halt build';status('Searching for a unique, logically solved puzzle…');
    const active=new Worker(new URL('./custom-build.worker.ts',import.meta.url),{type:'module'});worker=active;
    timer=window.setInterval(()=>status('Searching for a unique, logically solved puzzle…'),250);
    active.onmessage=(event:MessageEvent<{type:string;attempts:number;message?:string;string:string;grid:number[][];score:number;tally:Tally[]}>)=>{
      if(worker!==active)return;const d=event.data;attempts=d.attempts;
      if(d.type==='progress')return;
      stop();if(d.type==='error'){status('Build failed: '+d.message);return;}
      resultString=d.string;solutionString=d.grid.flat().join('');const {jigs}=decodeCompactPuzzle(d.string);
      get('result').hidden=false;get('puzzle').replaceChildren(puzzleBoard(jigs,size));get('solution').replaceChildren(puzzleBoard([],size,d.grid.flat()));
      solver.reset(jigs,size);solver.setVerifiedUnique(true);renderRating(get('rating'),d.score,d.tally,'Difficulty rating',step=>solver.jumpToStep(step));status('Unique puzzle built without backtracking.');
    };
    active.onerror=()=>{if(worker!==active)return;stop();status('Build failed. Please try again.');};
    const min=Number(get<HTMLSelectElement>('min').value),max=Number(get<HTMLSelectElement>('max').value);
    active.postMessage({size,selected,minimum:Math.min(min,max),maximum:Math.max(min,max)});
  });
  for(const [id,action] of [['copy',()=>copyPuzzleText(resultString)],['image',()=>copyPuzzleImage(resultString)],['copy-solution',()=>copyPuzzleText(solutionString)]] as const){
    get(id).addEventListener('click',async()=>{try{await action();get('copy-status').textContent=id==='image'?'Grid image copied as PNG.':'String copied.';}catch{get('copy-status').textContent='Clipboard access is unavailable. Please allow access and try again.';}});
  }
  window.addEventListener('pagehide',stop);render();
}
