import './style.css';
import { createSolverView } from './solver-view';
import { encodeCompactPuzzle } from './compact';
import { createJigs, generateSolution, type Grid, type Jig } from './sudoku';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="site-header"><a class="brand" href="./"><span class="brand-mark" aria-hidden="true">&gt;</span> Greater than Sudoku</a><span class="header-note">A different way to think inside the box.</span></header>
  <main>
    <section class="intro">
      <div><p class="eyebrow">THE SUDOKU LAB / 01</p><h1>A little less.<br>A little <em>greater.</em></h1><p class="description">Normal sudoku rules apply. The jigs indicate whether adjacent cells are greater than or less than each other.</p></div>
      <div class="generate-area"><button id="generate" type="button"><span aria-hidden="true">↻</span> Generate</button><p>A fresh grid. A new perspective.</p></div>
    </section>
    <section class="puzzles" aria-label="Generated Sudoku puzzles">
      <article class="puzzle-card"><div class="card-heading"><div><p class="eyebrow">01 / THE STARTING POINT</p><h2>Completed Sudoku</h2></div><span class="badge">81 numbers</span></div><div id="solution" class="board" role="img"></div><p class="card-caption"><span class="caption-dot"></span>Every row, column, and box contains 1–9.</p></article>
      <article class="puzzle-card jig-card"><div class="card-heading"><div><p class="eyebrow">02 / THE TRANSFORMATION</p><h2>Completed jig puzzle</h2></div><span class="badge green">108 jigs</span></div><div id="jigs" class="board" role="img"></div><p class="card-caption"><span class="caption-dot"></span>All the relationships. None of the numbers.</p></article>
    </section>
    <section class="guide" aria-label="How to read the jigs"><div><p class="eyebrow">FOLLOW THE SIGNS</p><h3>The point faces the smaller number.</h3></div><div class="example"><span>3</span><b>&lt;</b><span>8</span><p>Less than</p></div><div class="example"><span>9</span><b>&gt;</b><span>2</span><p>Greater than</p></div><p class="guide-note">The same rule applies vertically to <strong>∧</strong> and <strong>v</strong>.<br>Jigs stay within each 3×3 box.</p></section>
    <div class="bottom-line"><p id="status" role="status" aria-live="polite"></p><span>9 boxes × 12 jigs = 108 little clues</span></div>
  </main><footer><span>Greater than Sudoku</span><a href="https://github.com/nahiphog/GreaterThanSudoku">Source &amp; GPL-3.0 license</a></footer>
`;

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
document.querySelector('#jigs')!.insertAdjacentHTML('afterend', '<button id="copy-puzzle" class="copy-button" type="button">Copy puzzle string</button><p id="jig-copy-status" class="copy-status" role="status" aria-live="polite"></p><p id="selected-cell" class="selection-status" role="status" aria-live="polite">Select a cell to see its row and column.</p>');
document.querySelector('#selected-cell')!.insertAdjacentHTML('afterend', '<button id="check-uniqueness" class="copy-button" type="button">Check uniqueness</button><p id="uniqueness-status" class="selection-status" role="status" aria-live="polite"></p>');

const solverView = createSolverView();
document.querySelector('.generate-area')!.insertAdjacentHTML('beforeend', '<button id="generate-unique" class="copy-button" type="button">Generate until unique</button><p id="unique-search-status" role="status" aria-live="polite"></p>');

function renderBoard(element: HTMLElement, grid: Grid, jigs?: Jig[]) {
  element.replaceChildren();
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement(jigs ? 'button' : 'span');
      cell.className = `cell${col % 3 === 2 && col < 8 ? ' box-right' : ''}${row % 3 === 2 && row < 8 ? ' box-bottom' : ''}`;
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
    mark.style.left = `${(jig.col + (jig.direction === 'horizontal' ? 1 : 0.5)) / 9 * 100}%`;
    mark.style.top = `${(jig.row + (jig.direction === 'vertical' ? 1 : 0.5)) / 9 * 100}%`;
    mark.setAttribute('aria-hidden', 'true');
    element.append(mark);
  }
  element.setAttribute('aria-label', jigs ? 'Completed jig puzzle. Select a cell to identify its row and column.' : `Completed Sudoku. ${grid.map((row, i) => `Row ${i + 1}: ${row.join(', ')}`).join('. ')}`);
}

let generation = 0;
let puzzleString = '';
let solutionString = '';
let showNotes = false;
let candidates: number[][] = [];
let notesWorker: Worker | undefined;
let notesError = '';
let currentJigs: Jig[] = [];
let uniquenessWorker: Worker | undefined;
let cancelUniqueness: (() => void) | undefined;
let uniqueSearch: { attempts: number; startedAt: number; timer: number } | undefined;

function showSearchStatus(message: string) {
  if (!uniqueSearch) return;
  document.querySelector('#unique-search-status')!.textContent = `${message} Attempts: ${uniqueSearch.attempts}. Total elapsed time: ${((performance.now() - uniqueSearch.startedAt) / 1000).toFixed(3)} seconds.`;
}

function endUniqueSearch(message: string) {
  if (!uniqueSearch) return;
  showSearchStatus(message);
  window.clearInterval(uniqueSearch.timer);
  uniqueSearch = undefined;
  document.querySelector('#generate-unique')!.textContent = 'Generate until unique';
}

function tryNextPuzzle() {
  if (!uniqueSearch) return;
  uniqueSearch.attempts++;
  showSearchStatus('Searching…');
  generate();
}

document.querySelector('#generate-unique')!.addEventListener('click', () => {
  if (uniqueSearch) {
    endUniqueSearch('Search stopped.');
    cancelUniqueness?.();
    return;
  }
  uniqueSearch = { attempts: 0, startedAt: performance.now(), timer: 0 };
  uniqueSearch.timer = window.setInterval(() => showSearchStatus('Searching…'), 1000);
  document.querySelector('#generate-unique')!.textContent = 'Stop searching';
  tryNextPuzzle();
});

function startUniquenessCheck() {
  uniquenessWorker?.terminate();
  const startedAt = performance.now();
  const worker = new Worker(new URL('./uniqueness.worker.ts', import.meta.url), { type: 'module' });
  uniquenessWorker = worker;
  document.querySelector('#check-uniqueness')!.textContent = 'Cancel uniqueness check';
  document.querySelector('#uniqueness-status')!.textContent = 'Checking with local jig notes and sudokUI logical techniques…';
  const finish = (message: string, count?: number) => {
    if (uniquenessWorker !== worker) return;
    worker.terminate();
    uniquenessWorker = undefined;
    document.querySelector('#check-uniqueness')!.textContent = 'Check uniqueness';
    cancelUniqueness = undefined;
    document.querySelector('#uniqueness-status')!.textContent = `${message} Elapsed time: ${((performance.now() - startedAt) / 1000).toFixed(3)} seconds.`;
    if (uniqueSearch) {
      if (count === 1) endUniqueSearch('Unique puzzle found.');
      else if (count === 0 || count === 2) {
        const search = uniqueSearch;
        window.setTimeout(() => { if (uniqueSearch === search) tryNextPuzzle(); }, 0);
      } else endUniqueSearch('Search stopped before uniqueness could be determined.');
    }
  };
  cancelUniqueness = () => finish('Check cancelled — uniqueness is undetermined.');
  worker.onmessage = (event: MessageEvent<{ count?: number; error?: string; progress?: string; logicSteps?: number; usedBacktracking?: boolean }>) => {
    if (uniquenessWorker !== worker) return;
    if (event.data.progress) {
      document.querySelector('#uniqueness-status')!.textContent = event.data.progress;
      return;
    }
    const method = event.data.usedBacktracking ? `${event.data.logicSteps} logical steps, then backtracking on the remaining possibilities.` : `${event.data.logicSteps} logical steps; no backtracking needed.`;
    finish(event.data.error ?? ((event.data.count === 0 ? 'No solution.' : event.data.count === 1 ? 'Unique solution — exactly one valid completion.' : 'Not unique — at least two valid completions.') + ' ' + method), event.data.error ? undefined : event.data.count);
  };
  worker.onerror = () => finish('The uniqueness check failed. Please try again.');
  worker.postMessage(currentJigs);
}
document.querySelector('#check-uniqueness')!.addEventListener('click', () => {
  if (uniquenessWorker) {
    cancelUniqueness?.();
  } else startUniquenessCheck();
});

function updateNotes() {
  document.querySelectorAll<HTMLButtonElement>('#jigs .cell').forEach((cell, index) => {
    cell.replaceChildren();
    const coordinate = `R${Math.floor(index / 9) + 1}C${index % 9 + 1}`;
    cell.setAttribute('aria-label', showNotes && candidates.length ? `${coordinate}, candidates: ${candidates[index].join(', ')}` : coordinate);
    if (!showNotes || !candidates.length) return;
    const notes = document.createElement('span');
    notes.className = 'candidate-notes';
    notes.setAttribute('aria-hidden', 'true');
    for (let digit = 1; digit <= 9; digit++) {
      const mark = document.createElement('span');
      mark.textContent = candidates[index].includes(digit) ? String(digit) : '';
      notes.append(mark);
    }
    cell.append(notes);
  });
  const toggle = document.querySelector('#toggle-notes')!;
  toggle.textContent = showNotes ? 'Hide local jig notes' : 'Show local jig notes';
  toggle.setAttribute('aria-pressed', String(showNotes));
  document.querySelector('#notes-status')!.textContent = !showNotes ? '' : notesError || (candidates.length ? 'Notes use local jig comparisons only.' : 'Calculating local jig notes…');
}
document.querySelector('#toggle-notes')!.addEventListener('click', () => {
  showNotes = !showNotes;
  updateNotes();
});

function generate() {
  const grid = generateSolution();
  const jigs = createJigs(grid);
  currentJigs = jigs;
  solverView.reset(jigs);
  startUniquenessCheck();
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
  worker.postMessage(jigs);
  updateNotes();
  puzzleString = encodeCompactPuzzle(jigs);
  solutionString = grid.flat().join('');
  document.querySelector('#jig-copy-status')!.textContent = '';
  document.querySelector('#solution-copy-status')!.textContent = '';
  document.querySelector('#selected-cell')!.textContent = 'Select a cell to see its row and column.';
  generation++;
  document.querySelector('#status')!.textContent = `Puzzle ${String(generation).padStart(2, '0')} · Generated together, connected by logic.`;
}
document.querySelector('#generate')!.addEventListener('click', () => {
  endUniqueSearch('Search stopped to generate a new puzzle.');
  generate();
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
document.querySelector('#copy-solution')!.addEventListener('click', () => {
  void copyString(solutionString, '#solution-copy-status');
});
generate();
