import { createBacktrackingCheck } from './backtracking-check-view';
import type { Jig } from './sudoku';
import type { SolveFrame } from './logical-solver';

export function createSolverView(onVerified: (count:number)=>void = () => {}) {
  const section = document.createElement('section');
  section.className = 'solver-section';
  section.innerHTML = `<div class="solver-heading"><div><p class="eyebrow">FOLLOW THE DEDUCTIONS</p><h2>Step-by-step solver</h2></div><button id="solve-steps" type="button">Solve step by step</button></div>
    <p id="solver-status" role="status" aria-live="polite">Start from the local jig notes and follow the logical techniques.</p>
    <div id="solver-content" hidden><div class="solver-layout"><div id="solver-board" class="board" role="img"></div><div class="step-detail"><div class="step-navigation"><button id="step-prev" type="button">Previous</button><label>Step <select id="step-select" aria-label="Solving step"></select></label><button id="step-next" type="button">Next</button></div><h3 id="step-title"></h3><p id="step-description"></p><p id="step-placements"></p><p id="step-eliminations"></p><p class="step-key">Highlighted cells changed in this step. The grid shows the state after the deduction.</p></div></div></div>`;
  document.querySelector('.guide')!.before(section);
  const backtrackingCheck = createBacktrackingCheck(section, onVerified);
  const get = <T extends HTMLElement>(id: string) => section.querySelector<T>(`#${id}`)!;
  let worker: Worker | undefined;
  let frames: SolveFrame[] = [];
  let index = 0;
  let jigs: Jig[] = [];
  let size = 9;
  let verifiedUnique = false;
  const coordinate = (cell: number) => `R${Math.floor(cell / size) + 1}C${cell % size + 1}`;
  function render() {
    const frame = frames[index];
    if (!frame) return;
    get('solver-content').hidden = false;
    const board = get('solver-board'); board.replaceChildren();
    const changed = new Set([...frame.placements, ...frame.eliminations].map(x => x.cell));
    frame.values.forEach((value, cell) => {
      const row = Math.floor(cell / size), col = cell % size;
      const el = document.createElement('span');
      el.className = `cell${col % (size / 3) === size / 3 - 1 && col < size - 1 ? ' box-right' : ''}${row % 3 === 2 && row < size - 1 ? ' box-bottom' : ''}${changed.has(cell) ? ' deduction-cell' : ''}`;
      el.setAttribute('aria-hidden', 'true');
      if (value) el.textContent = String(value);
      else {
        const notes = document.createElement('span'); notes.className = 'solver-notes';
        for (let d = 1; d <= size; d++) { const mark = document.createElement('span'); mark.textContent = frame.candidates[cell].includes(d) ? String(d) : ''; notes.append(mark); }
        el.append(notes);
      }
      board.append(el);
    });
    for (const j of jigs) {
      const mark = document.createElement('span'); mark.className = `jig ${j.direction}`; mark.textContent = j.symbol;
      mark.style.left = `${(j.col + (j.direction === 'horizontal' ? 1 : .5)) / size * 100}%`;
      mark.style.top = `${(j.row + (j.direction === 'vertical' ? 1 : .5)) / size * 100}%`;
      mark.setAttribute('aria-hidden', 'true'); board.append(mark);
    }
    board.setAttribute('aria-label', frame.values.map((v, i) => `${coordinate(i)}: ${v || `candidates ${frame.candidates[i].join(', ')}`}`).join('; '));
    get('step-title').textContent = `${index}. ${frame.title}`;
    get('step-description').textContent = frame.description;
    get('step-placements').textContent = frame.placements.length ? `Place: ${frame.placements.map(p => `${coordinate(p.cell)} = ${p.digit}`).join('; ')}.` : '';
    get('step-eliminations').textContent = frame.eliminations.length ? `Remove: ${frame.eliminations.map(p => `${p.digit} from ${coordinate(p.cell)}`).join('; ')}.` : '';
    get<HTMLSelectElement>('step-select').value = String(index);
    get<HTMLButtonElement>('step-prev').disabled = index === 0;
    get<HTMLButtonElement>('step-next').disabled = index === frames.length - 1;
  }
  function stop() { worker?.terminate(); worker = undefined; get('solve-steps').textContent = 'Solve step by step'; }
  get('solve-steps').addEventListener('click', () => {
    if (!verifiedUnique) return;
    if (worker) { stop(); get('solver-status').textContent = 'Stopped. You can review the steps found so far or restart.'; return; }
    frames = []; index = 0; get('solver-content').hidden = true; get('step-select').replaceChildren();
    const active = new Worker(new URL('./logical-solver.worker.ts', import.meta.url), { type: 'module' }); worker = active;
    get('solve-steps').textContent = 'Stop solving'; get('solver-status').textContent = 'Starting from local jig notes…';
    active.onmessage = event => {
      if (worker !== active) return;
      const data = event.data;
      if (data.type === 'step') {
        frames.push(data.frame);
        const option = document.createElement('option'); option.value = String(frames.length - 1); option.textContent = `${frames.length - 1}: ${data.frame.title}`;
        get('step-select').append(option); render();
      } else if (data.type === 'progress') get('solver-status').textContent = data.message;
      else { stop(); get('solver-status').textContent = data.type === 'error' ? data.message : `Finished: ${data.logicSteps} logical steps${data.usedBacktracking ? ', then backtracking found one completion.' : '; solved entirely by logic.'} Use Next to follow the steps.`; }
    };
    active.onerror = () => { if (worker !== active) return; stop(); get('solver-status').textContent = 'The solver encountered an error. Please try again.'; };
    active.postMessage({jigs,size});
  });
  get('step-prev').addEventListener('click', () => { if (index > 0) { index--; render(); } });
  get('step-next').addEventListener('click', () => { if (index < frames.length - 1) { index++; render(); } });
  get('step-select').addEventListener('change', () => { index = Number(get<HTMLSelectElement>('step-select').value); render(); });
  function setVerifiedUnique(verified: boolean, message = 'Waiting for a verified unique solution before showing the walkthrough.') {
    verifiedUnique = verified;
    get<HTMLButtonElement>('solve-steps').disabled = !verified;
    if (!verified) { stop(); frames = []; index = 0; get('solver-content').hidden = true; get('step-select').replaceChildren(); }
    get('solver-status').textContent = verified ? 'Unique solution verified. Start the walkthrough from local jig notes.' : message;
  }
  setVerifiedUnique(false);
  return { setVerifiedUnique, reset(next: Jig[], nextSize = 9) { stop(); setVerifiedUnique(false); backtrackingCheck.reset(next, nextSize); size = nextSize; get("solver-board").dataset.size = String(size); jigs = next; frames = []; index = 0; get('solver-content').hidden = true; get('solver-status').textContent = 'Waiting for a verified unique solution before showing the walkthrough.'; } };
}
