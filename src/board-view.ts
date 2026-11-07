import type { Jig } from './sudoku';
export function puzzleBoard(jigs: Jig[], size: number, values?: number[]) {
  const board = document.createElement('div'); board.className = 'board'; board.dataset.size = String(size);
  board.setAttribute('role','img');
  board.setAttribute('aria-label', values ? `Completed ${size}×${size} Sudoku: ${values.join(', ')}` : `${size}×${size} jig puzzle with ${jigs.length} comparisons.`);
  const width=size/3;
  for(let row=0;row<size;row++) for(let col=0;col<size;col++) {
    const cell=document.createElement('span');cell.className=`cell${col%width===width-1&&col<size-1?' box-right':''}${row%3===2&&row<size-1?' box-bottom':''}`;
    if(values)cell.textContent=String(values[row*size+col]);board.append(cell);
  }
  for(const j of jigs) {
    const mark=document.createElement('span');mark.className=`jig ${j.direction}`;mark.textContent=j.symbol;
    mark.style.left=`${(j.col+(j.direction==='horizontal'?1:.5))/size*100}%`;
    mark.style.top=`${(j.row+(j.direction==='vertical'?1:.5))/size*100}%`;board.append(mark);
  }
  return board;
}
