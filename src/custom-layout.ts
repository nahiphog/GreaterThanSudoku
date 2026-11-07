import type { Grid, Jig } from './sudoku';

export function borderPositions(size:number):Omit<Jig,'symbol'>[] {
  return [
    ...Array.from({length:size},(_,row)=>Array.from({length:size-1},(_,col)=>({row,col,direction:'horizontal' as const}))).flat(),
    ...Array.from({length:size},(_,col)=>Array.from({length:size-1},(_,row)=>({row,col,direction:'vertical' as const}))).flat(),
  ];
}
export function parseLayout(text:string,size:number):boolean[] {
  const clean=text.replace(/\s/g,'');
  if(clean.length!==2*size*(size-1)||!/^[01]+$/.test(clean))throw new Error(`Enter exactly ${2*size*(size-1)} characters using only 0 and 1.`);
  return [...clean].map(x=>x==='1');
}
export function customJigs(grid:Grid,selected:boolean[]):Jig[] {
  return borderPositions(grid.length).flatMap((p,i)=>{
    if(!selected[i])return [];
    const a=grid[p.row][p.col],b=grid[p.row+(p.direction==='vertical'?1:0)][p.col+(p.direction==='horizontal'?1:0)];
    return [{...p,symbol:p.direction==='horizontal'?(a<b?'<':'>'):(a<b?'∧':'v')} as Jig];
  });
}
