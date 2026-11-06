# Greater than Sudoku

A TypeScript Sudoku generator built with Vite. Click **Generate** to replace both grids with a fresh completed Sudoku and its matching number-free jig puzzle.

Normal sudoku rules apply. The jigs indicate whether adjacent cells are greater than or less than each other. The point faces the smaller number. Comparisons appear only within each 3×3 box: 54 horizontal + 54 vertical = 108 jigs.

## Development

```sh
npm install
npm run dev
```

## Checks and build

```sh
npm test
npm run build
```

The production output is in `dist/`. Vite uses the `/GreaterThanSudoku/` base path for GitHub Pages. The local URL is `http://127.0.0.1:5173/GreaterThanSudoku/`.

## Copy format

**Copy puzzle string** copies exactly 144 characters, using the same edge order as [EitherOrSudoku](https://github.com/nahiphog/EitherOrSudoku/blob/main/lib/compact.ts):

- Characters 1–72: horizontal adjacencies, left to right within each row, rows 1–9.
- Characters 73–144: vertical adjacencies, top to bottom within each column, columns 1–9.
- `<` and `>` compare left/right cells; `∧` and `v` point toward the smaller top/bottom cell.
- `0` represents an absent jig. Generated layouts have 108 jigs and 36 zeros at box boundaries.

Copy buttons sit directly below each grid. The jig string is not displayed; the completed Sudoku copies 81 digits in row order, from R1C1 through R9C9. A legacy clipboard fallback is attempted if the Clipboard API is unavailable.

Click any cell in the completed jig puzzle to highlight it and show its coordinates, for example `Selected cell: R5C7`. Cells also support keyboard focus and Enter/Space activation. Generating a new puzzle clears the selection.

## Candidate notes

**Show local jig notes** / **Hide local jig notes** toggles small candidate digits in all 81 jig cells. The setting persists when generating a new puzzle. Notes use only the jig comparisons and their transitive chains. If a cell has S distinct cells known to be smaller and L distinct cells known to be larger in its box, its notes are S+1 through 9−L. Shared paths are counted once. Notes never use the displayed solution, full-solution search, or the uniqueness result. A separate background worker calculates them.

These are local candidate bounds, not conventional two-location Snyder marks. A displayed digit is not guaranteed to extend to a full solution. In the supplied example R2C3 retains 1, 2, 3, 4 under local jig deductions, even though full-puzzle search narrows it to 3. Copying still exports only the jig string, and selection works with notes shown or hidden.

## Step-by-step solving

**Solve step by step** starts a separate solving view from the empty jig grid and local notes. Use **Next**, **Previous**, or the step selector to inspect each state. Each step names its technique, explains the deduction, lists placements and candidate removals (including peer removals), and highlights changed cells on the grid after the step. The original jig grid, local notes, and export remain available separately.

The solver alternates jig inequality deductions with the enabled imported sudokUI techniques in their normal order: singles, intersections, subsets, fish, wings, chains, coloring, ALS, and the other enabled logical finders. Classic uniqueness techniques are excluded: a classic digit-swap argument need not preserve variant jigs. The engine receives only jigs and initial local notes, never the displayed solution or uniqueness result.

Only when no enabled logical technique or jig deduction can progress does backtracking search for one completion. Its final frame is explicitly labelled **Backtracking completion — last resort**; it is not presented as a logical proof or uniqueness claim. **Stop solving** cancels computation while preserving the trace already found. A new generated puzzle resets the trace and cancels stale work. All solving runs in its own worker.

## Independent uniqueness check

Each generated jig puzzle is checked in its own background worker, starting with local jig notes and the same imported sudokUI techniques as the step-by-step solver. It receives only the jigs and computes its own notes; it never reads the displayed solution. Classic uniqueness techniques are excluded because the checker must not assume the result it is trying to prove. If logical deductions fill the grid, they establish a unique completion without backtracking.

Only if logic stalls does backtracking explore the remaining possibilities, retaining every logical placement and candidate elimination. It exhausts that search before reporting zero or one solution, and stops after two solutions to report **Not unique — at least two valid completions**. The status shows the logical step count and whether search was needed. **Cancel uniqueness check** leaves the result undetermined; **Check uniqueness** restarts it. Generating another puzzle cancels the previous worker and discards stale results.

## GitHub Pages deployment

`.github/workflows/deploy.yml` installs locked dependencies with `npm ci`, runs tests and the TypeScript/production build, then publishes `dist/` using the official GitHub Pages actions. Pushes to `main` deploy automatically; manual runs are also supported. Set the repository's Pages source to **GitHub Actions**. YAML is the workflow format, not a runtime dependency.

## Imported solving techniques

The complete upstream TypeScript engine is vendored in `src/vendor/sudokui/` at revision `e9ce0ae9741e40b9b1caf0d9f6b801524c2e01aa`. `src/techniques.ts` exposes its board model, technique catalog, step finders, and step application. It includes singles, intersections, subsets, fish, wings, chains, coloring, ALS, forcing, uniqueness techniques, and the other upstream technique modules.

The imported solver entry point is type-checked during the build and exercised by the step-by-step solver tests. The classic engine runs in dedicated workers with additional jig deductions and excludes classic uniqueness techniques. Local notes use inequality bounds; the separate uniqueness worker applies logic before last-resort search.

## License

GPL-3.0. See `LICENSE` and `NOTICE` for the upstream source, revision, and attribution.
