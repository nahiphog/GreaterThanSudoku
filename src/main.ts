import './style.css';
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
    <section class="export-panel" aria-label="Copy jig puzzle">
      <div class="export-heading"><label for="puzzle-string">Completed jig puzzle · 144 characters</label><button id="copy-puzzle" type="button">Copy puzzle string</button></div>
      <textarea id="puzzle-string" readonly spellcheck="false" rows="3" aria-describedby="format-note"></textarea>
      <p id="format-note">Horizontal edges by row, then vertical edges by column. 0 means no jig.</p>
      <p id="copy-status" role="status" aria-live="polite"></p>
    </section>
    <section class="guide" aria-label="How to read the jigs"><div><p class="eyebrow">FOLLOW THE SIGNS</p><h3>The point faces the smaller number.</h3></div><div class="example"><span>3</span><b>&lt;</b><span>8</span><p>Less than</p></div><div class="example"><span>9</span><b>&gt;</b><span>2</span><p>Greater than</p></div><p class="guide-note">The same rule applies vertically to <strong>^</strong> and <strong>v</strong>.<br>Jigs stay within each 3×3 box.</p></section>
    <div class="bottom-line"><p id="status" role="status" aria-live="polite"></p><span>9 boxes × 12 jigs = 108 little clues</span></div>
  </main><footer><span>Greater than Sudoku</span><a href="https://github.com/nahiphog/GreaterThanSudoku">Source &amp; GPL-3.0 license</a></footer>
`;

function renderBoard(element: HTMLElement, grid: Grid, jigs?: Jig[]) {
  element.replaceChildren();
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('span');
      cell.className = `cell${col % 3 === 2 && col < 8 ? ' box-right' : ''}${row % 3 === 2 && row < 8 ? ' box-bottom' : ''}`;
      cell.setAttribute('aria-hidden', 'true');
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
  element.setAttribute('aria-label', jigs ? `Empty Sudoku grid with 108 comparisons. ${jigs.map(j => `Row ${j.row + 1}, column ${j.col + 1} ${j.symbol} ${j.direction === 'horizontal' ? 'right neighbor' : 'below neighbor'}`).join('; ')}` : `Completed Sudoku. ${grid.map((row, i) => `Row ${i + 1}: ${row.join(', ')}`).join('. ')}`);
}

let generation = 0;
function generate() {
  const grid = generateSolution();
  const jigs = createJigs(grid);
  renderBoard(document.querySelector('#solution')!, grid);
  renderBoard(document.querySelector('#jigs')!, grid, jigs);
  document.querySelector<HTMLTextAreaElement>('#puzzle-string')!.value = encodeCompactPuzzle(jigs);
  document.querySelector('#copy-status')!.textContent = '';
  generation++;
  document.querySelector('#status')!.textContent = `Puzzle ${String(generation).padStart(2, '0')} · Generated together, connected by logic.`;
}
document.querySelector('#generate')!.addEventListener('click', generate);
document.querySelector('#copy-puzzle')!.addEventListener('click', async () => {
  const field = document.querySelector<HTMLTextAreaElement>('#puzzle-string')!;
  const value = field.value;
  try {
    await navigator.clipboard.writeText(value);
    document.querySelector('#copy-status')!.textContent = field.value === value
      ? 'Copied all 144 characters.' : 'Copied the previous puzzle. Copy again for the current puzzle.';
  } catch {
    field.focus();
    field.select();
    document.querySelector('#copy-status')!.textContent = 'Clipboard unavailable. The string is selected—press Ctrl+C or ⌘C to copy.';
  }
});
generate();
