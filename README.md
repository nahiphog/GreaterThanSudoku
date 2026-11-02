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

**Show Snyder notations** / **Hide Snyder notations** toggles small candidate digits in all 81 jig cells. The setting persists when generating a new puzzle. Notes are computed from the jigs, never from the displayed solution. Each shown digit has at least one complete Sudoku solution satisfying all comparisons. Inequality bounds and Sudoku propagation prune candidates, then a search checks each remaining possibility. A background worker keeps the page responsive and is cancelled when a new puzzle is generated.

These are full candidate notes (not restricted to two-location box marks). Full-puzzle checking may narrow a cell further than a local jig argument: in the supplied example R2C3 is 3. Copying still exports only the jig string, and selection works with notes shown or hidden.

## GitHub Pages

`.github/workflows/deploy.yml` installs locked dependencies with `npm ci`, runs tests and the TypeScript/production build, then publishes `dist/` using the official GitHub Pages actions. Pushes to `main` deploy automatically; manual runs are also supported. Set the repository's Pages source to **GitHub Actions**. YAML is the workflow format, not a runtime dependency.

## Imported solving techniques

The complete upstream TypeScript engine is vendored in `src/vendor/sudokui/` at revision `e9ce0ae9741e40b9b1caf0d9f6b801524c2e01aa`. `src/techniques.ts` exposes its board model, technique catalog, step finders, and step application. It includes singles, intersections, subsets, fish, wings, chains, coloring, ALS, forcing, uniqueness techniques, and the other upstream technique modules.

The imported solver entry point is type-checked during the build and smoke-tested. The engine is not loaded into the generator page yet. It implements classic Sudoku. Candidate notes use a separate greater-than constraint search; integrating the imported human techniques, interactive solving, and explicit uniqueness checking await the next phase. Techniques that assume uniqueness must not be used until the relevant uniqueness assumption is established.

## License

GPL-3.0. See `LICENSE` and `NOTICE` for the upstream source, revision, and attribution.
