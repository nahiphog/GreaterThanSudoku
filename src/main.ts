import { createSolverView } from './solver-view';
import './style.css';
import { initCustomBuild } from './custom-build';
import { copyPuzzleImage } from './puzzle-image';
import { initVerify } from './verify';
import { initNavigation, navigate } from './navigation';
import { renderRating } from './rating-view';
import { initSimulation } from './simulation';
import type { Tally } from './difficulty';
import { hardestTechnique } from './generation-summary';
import { encodeCompactPuzzle } from './compact';
import { type Grid, type Jig } from './sudoku';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="site-header"><nav aria-label="Main navigation"><select id="page-menu" aria-label="Page"><option value="generate">Generate</option><option value="simulation">Simulation difficulty</option><option value="simulation-jigs">Simulation jigs</option><option value="verify">Verify</option><option value="custom-build">Custom Build</option></select></nav><a class="brand" href="/GreaterThanSudoku/generate/" data-page="generate"><span class="brand-mark" aria-hidden="true">&gt;</span> Greater than Sudoku</a><button id="about-open" type="button">About</button></header>
  <main id="home-page">
    <section class="intro">
      <div class="generate-area"><label>Grid type <select id="grid-type"><option value="6">6x6</option><option value="9" selected>9x9</option></select></label></div>
    </section>
    <section class="puzzles" aria-label="Generated Sudoku puzzles">
      <article class="puzzle-card"><div class="card-heading"><div><p class="eyebrow">01 / THE STARTING POINT</p><h2>Completed Sudoku</h2></div><span class="badge">81 numbers</span></div><div id="solution" class="board" role="img"></div><p class="card-caption"><span class="caption-dot"></span>Every row, column, and box contains 1–9.</p></article>
      <article class="puzzle-card jig-card"><div class="card-heading"><div><p class="eyebrow">02 / THE TRANSFORMATION</p><h2>Completed jig puzzle</h2></div><span class="badge green">108 jigs</span></div><div id="jigs" class="board" role="img"></div><p class="card-caption"><span class="caption-dot"></span>All the relationships. None of the numbers.</p></article>
    </section>
    <div class="bottom-line"><p id="status" role="status" aria-live="polite"></p><span>9 boxes × 12 jigs = 108 little clues</span></div>
  </main><footer><span>Greater than Sudoku</span><a href="https://github.com/nahiphog/GreaterThanSudoku">Source &amp; GPL-3.0 license</a></footer>
`;

document.body.insertAdjacentHTML('beforeend', '<dialog id="about-dialog"><p>Greater Than Sudoku: Normal sudoku rules apply. The jigs indicate whether adjacent cells are greater than or less than each other.</p><form method="dialog"><button>Close</button></form></dialog>');
document.querySelector('#about-open')!.addEventListener('click', () => document.querySelector<HTMLDialogElement>('#about-dialog')!.showModal());
const solutionCard = document.querySelector<HTMLElement>('.puzzle-card')!;
solutionCard.classList.add('solution-card');
document.querySelector('#home-page')!.append(solutionCard);
const verifyPage=initVerify();
const openSimulationStep=(_grid:Grid, step:number, string:string) => {
  navigate('verify');verifyPage.openPuzzle(string,step);
};
initSimulation(openSimulationStep);
initSimulation(openSimulationStep,'jigs');
initCustomBuild();
const solutionBoard = document.querySelector<HTMLElement>('#solution')!;
const solutionContent = document.createElement('div');
solutionContent.id = 'solution-content';
solutionContent.hidden = true;
solutionBoard.before(solutionContent);
solutionContent.append(solutionBoard, solutionBoard.nextElementSibling!);
solutionContent.insertAdjacentHTML('beforebegin', '<button id="toggle-solution" class="notes-toggle" type="button" aria-expanded="false" aria-controls="solution-content">Show completed Sudoku</button>');
document.querySelector('#toggle-solution')!.addEventListener('click', () => {
  solutionContent.hidden = !solutionContent.hidden;
  const toggle = document.querySelector('#toggle-solution')!;
  toggle.setAttribute('aria-expanded', String(!solutionContent.hidden));
  toggle.textContent = solutionContent.hidden ? 'Show completed Sudoku' : 'Hide completed Sudoku';
});
document.querySelector('#solution')!.insertAdjacentHTML('afterend', '<button id="copy-solution" class="copy-button" type="button">Copy 81-character string</button><p id="solution-copy-status" class="copy-status" role="status" aria-live="polite"></p>');
document.querySelector('#jigs')!.setAttribute('role', 'group');
document.querySelector('.jig-card .card-heading')!.insertAdjacentHTML('afterend', '<button id="toggle-notes" class="notes-toggle" type="button" aria-pressed="false" aria-controls="jigs">Show local jig notes</button><p id="notes-status" class="notes-status" role="status" aria-live="polite"></p>');
document.querySelector('#jigs')!.insertAdjacentHTML('afterend', '<div class="copy-actions"><button id="copy-puzzle" class="copy-button" type="button">Copy puzzle string</button><button id="copy-puzzle-image" class="copy-button" type="button">Copy grid as an image</button></div><p id="jig-copy-status" class="copy-status" role="status" aria-live="polite"></p><p id="selected-cell" class="selection-status" role="status" aria-live="polite">Select a cell to see its row and column.</p>');
document.querySelector('.generate-area')!.insertAdjacentHTML('beforeend', '<button id="generate-unique" class="copy-button" type="button">Generate</button><p id="unique-search-status" role="status" aria-live="polite"></p>');

function renderBoard(element: HTMLElement, grid: Grid, jigs?: Jig[]) {
  const size = grid.length, width = size / 3;
  element.dataset.size = String(size);
  element.replaceChildren();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = document.createElement(jigs ? 'button' : 'span');
      cell.className = `cell${col % width === width - 1 && col < size - 1 ? ' box-right' : ''}${row % 3 === 2 && row < size - 1 ? ' box-bottom' : ''}`;
      if (jigs) {
        (cell as HTMLButtonElement).type = 'button';
        cell.setAttribute('aria-label', `R${row + 1}C${col + 1}`);
        cell.setAttribute('aria-pressed', 'false');
        cell.addEventListener('click', () => {
          element.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
          cell.setAttribute('aria-pressed', 'true');
          document.querySelector('#selected-cell')!.textContent = `Selected cell: R${row + 1}C${col + 1}`;
        });
      } else {
        cell.setAttribute('aria-hidden', 'true');
      }
      if (!jigs) cell.textContent = String(grid[row][col]);
      element.append(cell);
    }
  }
  for (const jig of jigs ?? []) {
    const mark = document.createElement('span');
    mark.className = `jig ${jig.direction}`;
    mark.textContent = jig.symbol;
    mark.style.left = `${(jig.col + (jig.direction === 'horizontal' ? 1 : 0.5)) / size * 100}%`;
    mark.style.top = `${(jig.row + (jig.direction === 'vertical' ? 1 : 0.5)) / size * 100}%`;
    mark.setAttribute('aria-hidden', 'true');
    element.append(mark);
  }
  element.setAttribute('aria-label', jigs ? 'Completed jig puzzle. Select a cell to identify its row and column.' : `Completed Sudoku. ${grid.map((row, i) => `Row ${i + 1}: ${row.join(', ')}`).join('. ')}`);
}

let size = 9;
let ratingWorker: Worker | undefined;

document.querySelector('.jig-card')!.insertAdjacentHTML('afterend', '<section class="rating-panel"><p id="generation-time"></p><p id="hardest-technique" role="status"></p><div id="difficulty-result" role="status"></div><p>Rating = logical technique scores + 10,000 per guessed backtracking branch (including failed guesses). Jig deductions score 0. This rates one completion, not the uniqueness proof.</p></section>');
let generation = 0;
let puzzleString = '';
let solutionString = '';
let showNotes = false;
let showJigSolution=false;
let currentSolution:Grid=[];
const solutionToggle=document.createElement('button');solutionToggle.type='button';solutionToggle.className='notes-toggle';solutionToggle.textContent='Show solution';solutionToggle.setAttribute('aria-pressed','false');solutionToggle.setAttribute('aria-controls','jigs');
document.querySelector('#toggle-notes')!.after(solutionToggle);
solutionToggle.addEventListener('click',()=>{showJigSolution=!showJigSolution;updateNotes();});
const generatedSolver=createSolverView(()=>{}, {prefix:'generate-',slider:true,recheck:false});
let candidates: number[][] = [];
let notesWorker: Worker | undefined;
let notesError = '';
let currentJigs: Jig[] = [];
let diggingWorker:Worker|undefined;
let diggingTimer=0,diggingStarted=0,diggingAttempts=0,diggingMessage='';
const diggingOption=document.createElement('label');
diggingOption.className='digging-option';
diggingOption.innerHTML='<input id="dig-jigs" type="checkbox"> Dig out jigs while preserving uniqueness';
document.querySelector('#generate-unique')!.after(diggingOption);
const diggingMethodLabel=document.createElement('label');
diggingMethodLabel.className='digging-option';
diggingMethodLabel.innerHTML='Digging method <select id="dig-method" disabled><option value="single">Single jig</option><option value="rotational" selected>Rotational pairs (180°)</option></select>';
diggingOption.after(diggingMethodLabel);
const diggingMethod=document.querySelector<HTMLSelectElement>('#dig-method')!;
document.querySelector('#dig-jigs')!.addEventListener('change',()=>{diggingMethod.disabled=!document.querySelector<HTMLInputElement>('#dig-jigs')!.checked;});
function diggingStatus(){
  document.querySelector('#unique-search-status')!.textContent=`${diggingMessage} Attempts: ${diggingAttempts}. Total construction time: ${((performance.now()-diggingStarted)/1000).toFixed(3)} seconds.`;
}
function stopDigging(message?:string){
  if(!diggingWorker)return;
  diggingWorker.terminate();diggingWorker=undefined;window.clearInterval(diggingTimer);
  document.querySelector('#generate-unique')!.textContent='Generate';
  document.querySelector<HTMLInputElement>('#dig-jigs')!.disabled=false;
  diggingMethod.disabled=!document.querySelector<HTMLInputElement>('#dig-jigs')!.checked;
  if(message){diggingMessage=message;diggingStatus();}
}
function startDigging(dig:boolean){
  const method=diggingMethod.value;diggingMethod.disabled=true;
  diggingStarted=performance.now();diggingAttempts=0;diggingMessage='Finding a unique puzzle with all region jigs…';
  document.querySelector('#generate-unique')!.textContent=dig?'Stop digging':'Stop searching';
  document.querySelector<HTMLInputElement>('#dig-jigs')!.disabled=true;
  const active=new Worker(new URL('./digging.worker.ts',import.meta.url),{type:'module'});diggingWorker=active;
  diggingStatus();diggingTimer=window.setInterval(diggingStatus,250);
  active.onmessage=(event:MessageEvent<{type:string;attempts:number;message:string;grid:Grid;jigs:Jig[];total:number}>)=>{
    if(diggingWorker!==active)return;
    const d=event.data;diggingAttempts=d.attempts;
    if(d.type==='progress'){diggingMessage=d.message;diggingStatus();return;}
    if(d.type==='error'){stopDigging('Construction failed: '+d.message);return;}
    stopDigging();
    showNotes=false;
    displayPuzzle(d.grid,d.jigs,performance.now()-diggingStarted);
    diggingMessage=dig?`Unique puzzle constructed. ${d.jigs.length} / ${d.total} jigs remain; no remaining ${method==='rotational'?'rotational pair':'jig'} can be removed while preserving uniqueness.`:'Unique puzzle found. Exactly one solution verified.';
    diggingStatus();
  };
  active.onerror=()=>{if(diggingWorker===active)stopDigging('Construction failed. Please try again.');};
  active.postMessage({size,method,dig});
}

function startUniqueGeneration() {
  if(diggingWorker){stopDigging('Search cancelled; no new puzzle was produced.');return;}
  startDigging(document.querySelector<HTMLInputElement>('#dig-jigs')!.checked);
}
document.querySelector('#generate-unique')!.addEventListener('click', startUniqueGeneration);

function updateNotes() {
  document.querySelectorAll<HTMLButtonElement>('#jigs .cell').forEach((cell, index) => {
    cell.replaceChildren();
    const coordinate = `R${Math.floor(index / size) + 1}C${index % size + 1}`;
    if(showJigSolution){const value=currentSolution[Math.floor(index/size)][index%size];cell.textContent=String(value);cell.setAttribute('aria-label',coordinate+', value: '+value);return;}
    cell.setAttribute('aria-label', showNotes && candidates.length ? `${coordinate}, candidates: ${candidates[index].join(', ')}` : coordinate);
    if (!showNotes || !candidates.length) return;
    const notes = document.createElement('span');
    notes.className = 'candidate-notes';
    notes.setAttribute('aria-hidden', 'true');
    for (let digit = 1; digit <= size; digit++) {
      const mark = document.createElement('span');
      mark.textContent = candidates[index].includes(digit) ? String(digit) : '';
      notes.append(mark);
    }
    cell.append(notes);
  });
  solutionToggle.textContent=showJigSolution?'Hide solution':'Show solution';solutionToggle.setAttribute('aria-pressed',String(showJigSolution));
  const toggle = document.querySelector<HTMLButtonElement>('#toggle-notes')!;
  toggle.disabled=showJigSolution;
  toggle.textContent = showNotes ? 'Hide local jig notes' : 'Show local jig notes';
  toggle.setAttribute('aria-pressed', String(showNotes));
  document.querySelector('#notes-status')!.textContent = showJigSolution || !showNotes ? '' : notesError || (candidates.length ? 'Notes use local jig comparisons only.' : 'Calculating local jig notes…');
}
document.querySelector('#toggle-notes')!.addEventListener('click', () => {
  showNotes = !showNotes;
  updateNotes();
});

function startRating() {
  const jigs = currentJigs;
  ratingWorker?.terminate();
  const rating = new Worker(new URL('./difficulty.worker.ts', import.meta.url), {type:'module'});
  ratingWorker = rating;
  const ratingView = document.querySelector<HTMLElement>('#difficulty-result')!;
  ratingView.textContent = 'Calculating difficulty…';
  rating.onmessage = (event: MessageEvent<{error?:string;score:number;tally:Tally[]}>) => {
    if (ratingWorker !== rating) return;
    if (event.data.error) ratingView.textContent = 'Difficulty unavailable: ' + event.data.error;
    else {
      renderRating(ratingView,event.data.score,event.data.tally,'Difficulty rating',step=>generatedSolver.jumpToStep(step));
      document.querySelector('#hardest-technique')!.textContent='Hardest technique used: '+hardestTechnique(event.data.tally);
    }
    if(event.data.error)document.querySelector('#hardest-technique')!.textContent='Hardest technique unavailable.';
    rating.terminate(); ratingWorker=undefined;
  };
  rating.onerror = () => { if(ratingWorker === rating) {ratingView.textContent='Difficulty calculation failed.';document.querySelector('#hardest-technique')!.textContent='Hardest technique unavailable.';rating.terminate();ratingWorker=undefined;} };
  rating.postMessage({jigs,size});
}

function displayPuzzle(grid: Grid, jigs: Jig[], elapsedMs:number) {
  setPuzzleVisible(true);
  currentJigs = jigs;currentSolution=grid;showJigSolution=false;
  generatedSolver.reset(jigs,size);generatedSolver.setVerifiedUnique(true);generatedSolver.prepare();
  document.querySelector('#generation-time')!.textContent='Elapsed generation time: '+(elapsedMs/1000).toFixed(3)+' seconds (including attempts, uniqueness checks, and any digging).';
  document.querySelector('#hardest-technique')!.textContent='Hardest technique used: calculating…';
  startRating();
  renderBoard(document.querySelector('#solution')!, grid);
  renderBoard(document.querySelector('#jigs')!, grid, jigs);
  candidates = [];
  notesError = '';
  notesWorker?.terminate();
  const worker = new Worker(new URL('./candidates.worker.ts', import.meta.url), { type: 'module' });
  notesWorker = worker;
  worker.onmessage = (event: MessageEvent<{ candidates?: number[][]; error?: string }>) => {
    if (notesWorker !== worker) return;
    candidates = event.data.candidates ?? [];
    notesError = event.data.error ?? '';
    worker.terminate();
    updateNotes();
  };
  worker.onerror = () => {
    if (notesWorker !== worker) return;
    notesError = 'Unable to calculate notes. Please generate a new puzzle and try again.';
    worker.terminate();
    updateNotes();
  };
  worker.postMessage({jigs,size});
  updateNotes();
  puzzleString = encodeCompactPuzzle(jigs,size);
  solutionString = grid.flat().join('');
  document.querySelector('#jig-copy-status')!.textContent = '';
  document.querySelector('#solution-copy-status')!.textContent = '';
  document.querySelector('#selected-cell')!.textContent = 'Select a cell to see its row and column.';
  document.querySelector('#copy-solution')!.textContent = 'Copy ' + size * size + '-character string';
  solutionCard.querySelector('.badge')!.textContent = size * size + ' numbers';
  solutionCard.querySelector('.card-caption')!.textContent = 'Every row, column, and region contains 1–' + size + '.';
  document.querySelector('.jig-card .badge')!.textContent = jigs.length + ' jigs';
  document.querySelector('.bottom-line > span')!.textContent = size + ' regions · ' + jigs.length + ' jigs';
  generation++;
  document.querySelector('#status')!.textContent = `Puzzle ${String(generation).padStart(2, '0')} · Generated together, connected by logic.`;
}
document.querySelector('#grid-type')!.addEventListener('change', () => {
  stopDigging('Construction stopped to change grid type.');
  size = Number(document.querySelector<HTMLSelectElement>('#grid-type')!.value);
  notesWorker?.terminate();ratingWorker?.terminate();
  notesWorker=undefined;ratingWorker=undefined;
  generatedSolver.reset([],size);
  setPuzzleVisible(false);
});
async function copyString(value: string, statusId: string) {
  const copiedGeneration = generation;
  let copied = false;
  try {
    await navigator.clipboard.writeText(value);
    copied = true;
  } catch {
    const previousFocus = document.activeElement as HTMLElement | null;
    const field = document.createElement('textarea');
    field.value = value;
    field.className = 'clipboard-fallback';
    field.setAttribute('aria-label', 'Puzzle string to copy');
    document.body.append(field);
    field.select();
    try { copied = document.execCommand('copy'); } catch { /* Report failure below. */ }
    field.remove();
    previousFocus?.focus();
  }
  document.querySelector(statusId)!.textContent = copied
    ? copiedGeneration === generation ? `Copied all ${value.length} characters.` : 'Copied the previous puzzle. Copy again for the current puzzle.'
    : 'Clipboard access was blocked. Please allow clipboard access and try again.';
}
document.querySelector('#copy-puzzle')!.addEventListener('click', () => {
  void copyString(puzzleString, '#jig-copy-status');
});
document.querySelector('#copy-puzzle-image')!.addEventListener('click', async () => {
  const status=document.querySelector('#jig-copy-status')!;
  try {await copyPuzzleImage(puzzleString);status.textContent='Grid image copied as PNG.';}
  catch {status.textContent='Image clipboard access is unavailable. Please allow clipboard access or try a supported browser.';}
});
document.querySelector('#copy-solution')!.addEventListener('click', () => {
  void copyString(solutionString, '#solution-copy-status');
});
function setPuzzleVisible(visible:boolean) {
  document.querySelectorAll<HTMLElement>('#home-page > .puzzles, #home-page > .solver-section, #home-page > .solution-card, #home-page > .bottom-line').forEach(el=>el.hidden=!visible);
  if(!visible)document.querySelector('#unique-search-status')!.textContent='Choose a grid type and click Generate to create a puzzle.';
}
setPuzzleVisible(false);
initNavigation();
