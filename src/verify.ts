import { decodeCompactPuzzle } from './compact';
import { puzzleBoard } from './board-view';
import { createSolverView } from './solver-view';
import { renderRating } from './rating-view';
import type { Tally } from './difficulty';

export function initVerify() {
  const main=document.createElement('main');main.id='verify-page';main.hidden=true;
  main.innerHTML=`<h1>Verify</h1><form id="verify-form"><label for="verify-input">Puzzle string</label><textarea id="verify-input" rows="5" spellcheck="false" required aria-describedby="verify-help"></textarea><p id="verify-help">Paste 144 characters for 9×9 or 60 for 6×6. Horizontal comparisons come first, then vertical comparisons. Use 0 for missing jigs. Whitespace is ignored, and ^ is accepted as ∧.</p><div class="verify-actions"><button id="verify-toggle" type="submit">Verify</button></div></form><p id="verify-status" role="status">Enter a puzzle string to check its uniqueness.</p><div id="verify-results" hidden><div class="puzzles"><section class="puzzle-card"><h2>Jig puzzle</h2><div id="verify-puzzle"></div></section><section class="puzzle-card"><h2>Completed Sudoku</h2><div id="verify-solution"></div></section></div><section class="rating-panel"><div id="verify-rating"></div></section></div><div id="verify-walkthrough"></div>`;
  document.querySelector('footer')!.before(main);
  const get=<T extends HTMLElement>(id:string)=>main.querySelector<T>('#'+id)!;
  const solver=createSolverView(()=>{}, {host:get('verify-walkthrough'),prefix:'verify-',slider:true});
  get('verify-walkthrough').hidden=true;
  let requestedStep:number|undefined;
  let worker:Worker|undefined,startedAt=0,verified=false,inputRevision=0;
  const elapsed=()=>`Elapsed time: ${((performance.now()-startedAt)/1000).toFixed(3)} seconds.`;
  function stop(){worker?.terminate();worker=undefined;get<HTMLButtonElement>('verify-toggle').textContent='Verify';}
  function clear(){requestedStep=undefined;stop();verified=false;get('verify-results').hidden=true;get('verify-walkthrough').hidden=true;solver.reset([],9);get('verify-rating').replaceChildren();get('verify-solution').replaceChildren();get('verify-puzzle').replaceChildren();}
  const input=get<HTMLTextAreaElement>('verify-input');
  function inputChanged(){inputRevision++;clear();get('verify-status').textContent=input.value?'Input changed. Select Verify to check this puzzle.':'Enter a puzzle string to check its uniqueness.';}
  input.addEventListener('input',inputChanged);
  const paste=document.createElement('button');paste.type='button';paste.textContent='Paste clipboard';
  const clearInput=document.createElement('button');clearInput.type='button';clearInput.textContent='Clear input';
  get('verify-toggle').after(paste,clearInput);
  paste.addEventListener('click',async()=>{
    const revision=++inputRevision;
    try {
      const text=await navigator.clipboard.readText();
      if(revision!==inputRevision)return;
      input.value=text;inputChanged();input.focus();
    } catch {
      if(revision===inputRevision)get('verify-status').textContent='Unable to read the clipboard. Paste directly into the input using Ctrl+V or Command+V.';
    }
  });
  clearInput.addEventListener('click',()=>{input.value='';inputChanged();input.focus();});
  get('verify-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(worker){cancel();return;}
    inputRevision++;clear();startedAt=performance.now();
    let puzzle:ReturnType<typeof decodeCompactPuzzle>;
    try {puzzle=decodeCompactPuzzle(get<HTMLTextAreaElement>('verify-input').value);}
    catch(error){get('verify-status').textContent=String(error instanceof Error?error.message:error);return;}
    solver.reset(puzzle.jigs,puzzle.size);
    get('verify-status').textContent=`Checking this ${puzzle.size}×${puzzle.size} puzzle using local jig notes and logical techniques, with backtracking only if deductions stall…`;
    get<HTMLButtonElement>('verify-toggle').textContent='Cancel';
    const active=new Worker(new URL('./verify.worker.ts',import.meta.url),{type:'module'});worker=active;
    active.onmessage=(event:MessageEvent<{type:string;count?:number;solution?:number[];score:number;tally:Tally[];message?:string;logicSteps?:number;usedBacktracking?:boolean}>)=>{
      if(worker!==active)return;const data=event.data;
      if(data.type==='progress') {get('verify-status').textContent=data.message+' '+elapsed();return;}
      if(data.type==='verified') {
        verified=data.count===1;
        const method=data.usedBacktracking?`${data.logicSteps} logical steps, then backtracking on the remaining possibilities.`:`${data.logicSteps} logical steps; no backtracking needed.`;
        get('verify-status').textContent=(verified?'Unique solution — exactly one valid completion.':data.count===0?'No solution. Difficulty and walkthrough are unavailable.':'Not unique — at least two valid completions. Difficulty and walkthrough are unavailable.')+' '+method+' '+elapsed();
        if(!verified){stop();return;}
        get('verify-results').hidden=false;get('verify-walkthrough').hidden=false;
        get('verify-puzzle').append(puzzleBoard(puzzle.jigs,puzzle.size));
        get('verify-solution').append(puzzleBoard([],puzzle.size,data.solution));
        get('verify-rating').textContent='Calculating difficulty…';solver.setVerifiedUnique(true);solver.prepare();
      } else if(data.type==='rating') {
        renderRating(get('verify-rating'),data.score,data.tally,'Difficulty rating',step=>solver.jumpToStep(step));if(requestedStep!==undefined){solver.jumpToStep(requestedStep);requestedStep=undefined;}stop();
      } else {
        if(verified)get('verify-rating').textContent='Difficulty unavailable: '+data.message;
        else get('verify-status').textContent='Verification failed: '+data.message+' '+elapsed();
        stop();
      }
    };
    active.onerror=()=>{if(worker!==active)return;if(verified)get('verify-rating').textContent='Difficulty calculation failed.';else get('verify-status').textContent='Verification failed. '+elapsed();stop()};
    active.postMessage({string:puzzle.string});
  });
  function cancel(){
    if(!worker)return;
    if(verified)get('verify-rating').textContent='Difficulty calculation cancelled. '+elapsed();
    else get('verify-status').textContent='Check cancelled — uniqueness is undetermined. '+elapsed();
    stop();
  }
  return {openPuzzle(string:string,step?:number){
    input.value=string;inputChanged();get<HTMLFormElement>('verify-form').requestSubmit();requestedStep=step;
  }};

}
