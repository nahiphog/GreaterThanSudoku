/** Classic Sudoku engine imported from AImenes/sudokUI; see NOTICE and LICENSE.
 * Kept separate from the generator until the greater-than solver is implemented.
 * This engine alone does not enforce jigs or establish variant uniqueness.
 */
export { findNextStep, findStep, findAllSteps, applyStep } from './vendor/sudokui/humanSolver';
export { TECHS, SOLVE_ORDER } from './vendor/sudokui/ratings';
export { gridFromValues, parseGrid, cloneGrid } from './vendor/sudokui/board';
export type { Grid } from './vendor/sudokui/board';
export type { Step } from './vendor/sudokui/steps';
export type { Tech } from './vendor/sudokui/ratings';
