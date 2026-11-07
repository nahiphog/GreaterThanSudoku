import { decodeCompactPuzzle } from './compact';

/** Render puzzle data directly to PNG, including white backing beneath each jig. */
export function puzzlePng(string: string): Promise<Blob> {
  const {jigs,size}=decodeCompactPuzzle(string);
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=960;
  const ctx=canvas.getContext('2d');if(!ctx) return Promise.reject(new Error('Image rendering is unavailable.'));
  const margin=24, side=912, cell=side/size;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,960,960);
  for(let i=0;i<=size;i++) {
    ctx.strokeStyle=i%3===0?'#45594a':'#dce1d8';ctx.lineWidth=i%3===0?4:1;
    ctx.beginPath();ctx.moveTo(margin,margin+i*cell);ctx.lineTo(margin+side,margin+i*cell);ctx.stroke();
    ctx.strokeStyle=i%(size/3)===0?'#45594a':'#dce1d8';ctx.lineWidth=i%(size/3)===0?4:1;
    ctx.beginPath();ctx.moveTo(margin+i*cell,margin);ctx.lineTo(margin+i*cell,margin+side);ctx.stroke();
  }
  ctx.font=`${Math.round(cell*.35)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const j of jigs) {
    const x=margin+(j.col+(j.direction==='horizontal'?1:.5))*cell,y=margin+(j.row+(j.direction==='vertical'?1:.5))*cell;
    ctx.fillStyle='#ffffff';ctx.fillRect(x-cell*.18,y-cell*.2,cell*.36,cell*.4);
    ctx.fillStyle='#63823f';ctx.fillText(j.symbol,x,y);
  }
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create PNG image.')),'image/png'));
}
export async function copyPuzzleText(text:string) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const previous=document.activeElement as HTMLElement|null;
    const field=document.createElement('textarea');field.value=text;field.className='clipboard-fallback';document.body.append(field);field.select();
    const copied=document.execCommand('copy');field.remove();previous?.focus();
    if(!copied)throw new Error('Clipboard access was blocked.');
  }
}
export async function copyPuzzleImage(string:string) {
  if(!navigator.clipboard?.write || typeof ClipboardItem==='undefined') throw new Error('This browser does not support copying PNG images.');
  await navigator.clipboard.write([new ClipboardItem({'image/png':puzzlePng(string)})]);
}
