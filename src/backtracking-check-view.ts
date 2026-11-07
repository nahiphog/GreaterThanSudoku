import type { Jig } from './sudoku';

export function createBacktrackingCheck(section: HTMLElement) {
  const container = document.createElement('div');
  container.className = 'backtracking-check';
  container.innerHTML = '<button type="button" id="check-backtracking">Check uniqueness — backtracking only</button><p id="backtracking-status" role="status" aria-live="polite">Independent check from an empty grid, without local notes or logical techniques.</p>';
  section.querySelector('#solver-content')!.before(container);
  const button = container.querySelector<HTMLButtonElement>('button')!;
  const status = container.querySelector('p')!;
  let worker: Worker | undefined, startedAt = 0;
  let jigs: Jig[] = [], size = 9;
  function stop() { worker?.terminate(); worker = undefined; button.textContent = 'Check uniqueness — backtracking only'; }
  function finish(message: string) {
    stop(); status.textContent = `${message} Elapsed time: ${((performance.now() - startedAt) / 1000).toFixed(3)} seconds.`;
  }
  button.addEventListener('click', () => {
    if (worker) { finish('Check cancelled — uniqueness is undetermined.'); return; }
    startedAt = performance.now();
    try {
      const active = new Worker(new URL('./backtracking-uniqueness.worker.ts', import.meta.url), { type: 'module' });
      worker = active; button.textContent = 'Cancel backtracking check';
      status.textContent = 'Checking from an empty grid with backtracking only…';
      active.onmessage = (event: MessageEvent<{ count?: number; error?: string }>) => {
        if (worker !== active) return;
        finish(event.data.error ?? (event.data.count === 0 ? 'No solution — backtracking exhausted all possibilities.' : event.data.count === 1 ? 'Unique solution — backtracking found exactly one valid completion.' : 'Not unique — backtracking found at least two valid completions.'));
      };
      active.onerror = () => { if (worker === active) finish('The backtracking-only check failed. Please try again.'); };
      active.postMessage({ jigs, size });
    } catch { finish('The backtracking-only check could not start. Please try again.'); }
  });
  return { reset(next: Jig[], nextSize: number) { stop(); jigs = next; size = nextSize; status.textContent = 'Independent check from an empty grid, without local notes or logical techniques.'; } };
}
