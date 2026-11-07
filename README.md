# Greater than Sudoku

A TypeScript Sudoku generator built with Vite. Click **Generate** to search for a fresh puzzle with a verified unique solution. The previous single-attempt Generate button has been removed.

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

## Grid formats and navigation

The maker defaults to **9×9** (nine 3×3 regions) and also supports **6×6** (six regions of three rows by two columns), matching the requested layout:

```
112233
112233
112233
445566
445566
445566
```

The 6×6 format has 36 values and 42 jigs. Its compact string contains 60 positions: 30 horizontal edges in row order followed by 30 vertical edges in column order, using 0 at missing boundaries. The 9×9 string remains 144 characters. Notes, selection, copying, uniqueness, automatic unique generation, and the step solver follow the selected size. The completed Sudoku is at the bottom and remains collapsed by default.

Header links open the maker and **Simulation difficulty** (`#simulation`, compatible with GitHub Pages). **About** opens the requested rules text in a keyboard-accessible modal.

## Difficulty ratings

Only a puzzle with a verified unique solution is rated in a background worker by solving from local notes. Rating and walkthrough workers also enforce this prerequisite. Non-unique, unsatisfiable, or unverified puzzles have no rating and cannot start the walkthrough. The score sums the imported sudokUI catalog's per-technique scores. Each attempted backtracking guess—including failed guesses—adds **10,000**, so one fallback search can contribute many such penalties. Deterministic propagation inside that search is part of the backtracking operation, not a separate rated logical step. Local jig deductions have score 0. The visible technique table has exactly two columns: **Techniques** and **Steps**. Each row lists all matching walkthrough step numbers, with rows sorted by ascending technique score. Step 0 is the initial local notes and is not a deduction. The backtracking row points to the final completion frame; its internal guessed branches still each contribute 10,000 to the overall rating.

Ratings describe the deterministic path to **one completion**, not a uniqueness proof or a guarantee of human difficulty. The 9×9 engine uses the imported advanced finders. The 6×6 engine uses size-aware jig comparisons, naked/hidden singles, locked candidates, and naked pairs, followed by search only if they stall. Scores across grid sizes therefore use different available technique sets.

## Simulation difficulty

Choose trials (1, 10, **100 default**, 1000, 10000, 100000, 1000000), grid size (**9×9 default** or 6×6), and minimum displayed score (0 default, 500, 1000, 2000, 3000, 10000, 10000000). Each trial generates one random puzzle and verifies uniqueness. Only unique puzzles are rated; all others are counted as skipped. The threshold is inclusive.

Progress shows completed trials, unique puzzles rated, skipped puzzles, matching puzzles, and elapsed time. Mean, minimum and maximum ratings use only the verified unique puzzles; there is no rating assigned to skipped puzzles. Matches show the jig grid, its 144-character (9×9) or 60-character (6×6) string, and its individual tally. Ten matches are rendered per page; other matches are kept in browser IndexedDB for the current run. Starting a new run or leaving/reloading the website clears that temporary run storage. Browser storage failures stop the run explicitly and leave already reported results available. Large runs are cancellable; a cancelled in-progress trial is not counted as completed. Normal hash navigation preserves an active simulation.

## Candidate notes

The completed Sudoku starts hidden. **Show completed Sudoku** / **Hide completed Sudoku** expands or collapses the solution and its copy button; the selection persists while generating new puzzles.

**Show local jig notes** / **Hide local jig notes** toggles small candidate digits in all jig cells. The setting persists when generating a new puzzle. Notes use only the jig comparisons and their transitive chains. If a cell has S distinct cells known to be smaller and L distinct cells known to be larger in its box, its notes are S+1 through N−L, where N is the grid size. Shared paths are counted once. Notes never use the displayed solution, full-solution search, or the uniqueness result. A separate background worker calculates them.

These are local candidate bounds, not conventional two-location Snyder marks. A displayed digit is not guaranteed to extend to a full solution. In the supplied example R2C3 retains 1, 2, 3, 4 under local jig deductions, even though full-puzzle search narrows it to 3. Copying still exports only the jig string, and selection works with notes shown or hidden.

## Step-by-step solving

**Solve step by step** starts a separate solving view from the empty jig grid and local notes. Use **Next**, **Previous**, or the step selector to inspect each state. Each step names its technique, explains the deduction, lists placements and candidate removals (including peer removals), and highlights changed cells on the grid after the step. The original jig grid, local notes, and export remain available separately.

The solver alternates jig inequality deductions with the enabled imported sudokUI techniques in their normal order: singles, intersections, subsets, fish, wings, chains, coloring, ALS, and the other enabled logical finders. Classic uniqueness techniques are excluded: a classic digit-swap argument need not preserve variant jigs. The engine receives only jigs and initial local notes, never the displayed solution or uniqueness result.

Only when no enabled logical technique or jig deduction can progress does backtracking search for one completion. Its final frame is explicitly labelled **Backtracking completion — last resort**; it is not presented as a logical proof or uniqueness claim. **Stop solving** cancels computation while preserving the trace already found. A new generated puzzle resets the trace and cancels stale work. All solving runs in its own worker.

## Independent uniqueness check

The walkthrough also has **Check uniqueness — backtracking only**, a separate optional verifier for both grid sizes. It starts from an empty grid and tests digits against assigned row, column, region, and adjacent jig values only; it never reads local notes, logical deductions, the displayed solution, or the current walkthrough step. It exhausts the search to establish zero or one solution and stops at two to establish non-uniqueness. The result includes elapsed time. **Cancel backtracking check** leaves uniqueness undetermined; generating a puzzle or changing grid size cancels and clears this independent check. Its work does not affect the difficulty rating or the existing logic-first checker.

**Generate** repeatedly generates fresh puzzles and runs the logic-first uniqueness checker until one is confirmed unique. The displayed puzzle is updated each attempt and the successful puzzle stays on screen. A live status shows attempts started and total elapsed time, including generation and all checks. **Stop searching** cancels the current check and preserves the final totals. The initial page load and grid-size changes also start this unique-puzzle search. A checker failure stops the search with its error instead of retrying indefinitely.

Each generated jig puzzle is checked in its own background worker, starting with local jig notes and the same imported sudokUI techniques as the step-by-step solver. It receives only the jigs and computes its own notes; it never reads the displayed solution. Classic uniqueness techniques are excluded because the checker must not assume the result it is trying to prove. If logical deductions fill the grid, they establish a unique completion without backtracking.

Only if logic stalls does backtracking explore the remaining possibilities, retaining every logical placement and candidate elimination. It exhausts that search before reporting zero or one solution, and stops after two solutions to report **Not unique — at least two valid completions**. The status shows the logical step count and whether search was needed. **Cancel uniqueness check** leaves the result undetermined; **Check uniqueness** restarts it. Generating another puzzle cancels the previous worker and discards stale results.

## GitHub Pages deployment

`.github/workflows/deploy.yml` installs locked dependencies with `npm ci`, runs tests and the TypeScript/production build, then publishes `dist/` using the official GitHub Pages actions. Pushes to `main` deploy automatically; manual runs are also supported. Set the repository's Pages source to **GitHub Actions**. YAML is the workflow format, not a runtime dependency.

## Temporarily disabled techniques

The shared logical order excludes **3D Medusa, Finned Jellyfish, Grouped Nice Loop, Aligned Pair Exclusion, ALS-XY-Chain, Digit Forcing Chain, and Nishio Forcing Chain**. This applies to logic-first uniqueness checks, ratings, walkthroughs, and simulations; the imported implementations remain available in the vendor source for later re-enabling.

## Imported solving techniques

Uniqueness results include elapsed wall-clock time in seconds, measured from starting the check through receiving its output, including worker startup. Cancelled and failed checks also display elapsed time.

The complete upstream TypeScript engine is vendored in `src/vendor/sudokui/` at revision `e9ce0ae9741e40b9b1caf0d9f6b801524c2e01aa`. `src/techniques.ts` exposes its board model, technique catalog, step finders, and step application. It includes singles, intersections, subsets, fish, wings, chains, coloring, ALS, forcing, uniqueness techniques, and the other upstream technique modules.

The imported solver entry point is type-checked during the build and exercised by the step-by-step solver tests. The classic engine runs in dedicated workers with additional jig deductions and excludes classic uniqueness techniques. Local notes use inequality bounds; the separate uniqueness worker applies logic before last-resort search.

## License

GPL-3.0. See `LICENSE` and `NOTICE` for the upstream source, revision, and attribution.
