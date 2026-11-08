import type { CellDigit, Step } from './vendor/sudokui/steps';

export type HighlightRole='primary'|'secondary'|'fins'|'purple-dark'|'purple-light'|'orange-dark'|'orange-light';
export type HighlightGroup={role:HighlightRole;label:string;cells:number[];candidates:CellDigit[]};
export type HighlightState={values:ArrayLike<number>;candidates:number[][]};

export function houseCells(unit:number,size:number):number[]{
  if(unit<size)return Array.from({length:size},(_,c)=>unit*size+c);
  if(unit<size*2)return Array.from({length:size},(_,r)=>r*size+unit-size);
  const b=unit-size*2,width=size/3;
  return Array.from({length:size},(_,i)=>(Math.floor(b/3)*3+Math.floor(i/width))*size+b%3*width+i%width);
}
/** Retain the finder's evidence, including chain endpoints, ALS members and both colouring clusters. */
export function techniqueHighlights(step:Step,state:HighlightState,size:number):HighlightGroup[]{
  const groups:HighlightGroup[]=[];
  const add=(role:HighlightRole,label:string,candidates:CellDigit[]=[],cells:number[]=[])=>{
    const unique=[...new Map(candidates.map(cd=>[`${cd.cell}:${cd.digit}`,{...cd}])).values()];
    const all=[...new Set([...cells,...unique.map(cd=>cd.cell)])].sort((a,b)=>a-b);
    if(all.length)groups.push({role,label,cells:all,candidates:unique});
  };
  const domain=(cell:number)=>state.values[cell]?[state.values[cell]]:state.candidates[cell];
  const explicit=[...(step.primary??[]),...(step.secondary??[]),...(step.fins??[]),...(step.colouring?.clusters.flatMap(c=>[...c.dark,...c.light])??[])];
  const marked=new Set(explicit.map(cd=>`${cd.cell}:${cd.digit}`));
  const extra=[...(step.links?.flatMap(l=>[...l.from,...l.to])??[]),...(step.sets?.flatMap(s=>s.members)??[]),...(step.chainCells?.flatMap(cell=>domain(cell).map(digit=>({cell,digit})))??[])].filter(cd=>!marked.has(`${cd.cell}:${cd.digit}`));
  const primaryUnits=step.units?.filter(u=>u.role==='primary').flatMap(u=>houseCells(u.unit,size))??[];
  const secondaryUnits=step.units?.filter(u=>u.role==='secondary').flatMap(u=>houseCells(u.unit,size))??[];
  // Full House's evidence is the already placed values in the house.
  const fullHouse=step.tech==='FULL_HOUSE'?primaryUnits.filter(c=>state.values[c]).map(cell=>({cell,digit:state.values[cell]})):[];
  add('primary','Relevant rows, columns or regions',[],primaryUnits);
  add('secondary','Supporting rows, columns or regions',[],secondaryUnits);
  add('primary',step.labels?.primary??'Pattern and chain candidates',[...(step.primary??[]),...extra,...fullHouse],[...(step.chainCells??[]),...(step.sets?.flatMap(s=>s.cells)??[])]);
  add('secondary',step.labels?.secondary??'Supporting cells and candidates',step.secondary);
  add('fins',step.labels?.fins??'Fins, exceptions or contradiction',step.fins);
  step.colouring?.clusters.forEach((cluster,i)=>{
    add(i===0?'purple-dark':'orange-dark',`Colour group ${i+1}: dark`,cluster.dark);
    add(i===0?'purple-light':'orange-light',`Colour group ${i+1}: light`,cluster.light);
  });
  return groups;
}
export function jigHighlights(a:number,b:number,state:HighlightState):HighlightGroup[]{
  return [{role:'primary',label:'Compared cells and their possible values',cells:[a,b],candidates:[a,b].flatMap(cell=>(state.values[cell]?[state.values[cell]]:state.candidates[cell]).map(digit=>({cell,digit})))}];
}

/** Rebuilt for each frame so highlights never leak into later steps. */
export function highlightLookup(groups:HighlightGroup[]=[]){
  const cells=new Map<number,HighlightRole>(), candidates=new Map<string,HighlightRole>();
  for(const group of groups){
    for(const cell of group.cells)cells.set(cell,group.role);
    for(const cd of group.candidates)candidates.set(`${cd.cell}:${cd.digit}`,group.role);
  }
  return {cells,candidates};
}
