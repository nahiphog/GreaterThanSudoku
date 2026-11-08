/** One frequency per remaining-jig count; independent of the result-card filter. */
export function createJigHistogram(size:number):number[]{return Array((size===6?42:108)+1).fill(0);}
export function recordJigCount(counts:number[],jigCount:number){
  if(!Number.isInteger(jigCount)||jigCount<0||jigCount>=counts.length)throw new Error('Invalid jig count.');
  counts[jigCount]++;
}
export function histogramSvg(counts:number[]):string{
  const maxJigs=counts.length-1, peak=Math.max(1,...counts), total=counts.reduce((a,b)=>a+b,0);
  const magnitude=10**Math.floor(Math.log10(peak/4||1));
  const tick=[1,2,5,10].map(x=>x*magnitude).find(x=>x>=peak/4)!;
  const spacing=Math.max(1,tick), top=Math.ceil(peak/spacing)*spacing;
  const left=72,right=980,base=270,height=220,barWidth=(right-left)/counts.length;
  const ticks=Array.from({length:Math.floor(top/spacing)+1},(_,i)=>i*spacing).map(n=>{
    const y=base-n/top*height;
    return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" class="histogram-line"/><text x="${left-10}" y="${y+4}" text-anchor="end">${n.toLocaleString()}</text>`;
  }).join('');
  const bars=counts.map((count,jigs)=>{
    const x=left+jigs*barWidth, h=count/top*height;
    return count?`<rect x="${x+barWidth*.1}" y="${base-h}" width="${barWidth*.8}" height="${h}" tabindex="0" role="img" aria-label="${jigs} jigs: ${count} puzzles"><title>${jigs} jigs: ${count.toLocaleString()} puzzles</title></rect>`:'';
  }).join('');
  const labels=counts.map((_,i)=>i).filter(i=>i%(maxJigs===42?5:10)===0||i===maxJigs).map(i=>`<text x="${left+(i+.5)*barWidth}" y="292" text-anchor="middle">${i}</text>`).join('');
  return `<svg viewBox="0 0 1000 330" role="group" aria-label="Remaining jig counts for ${total.toLocaleString()} completed unique puzzles">${ticks}${bars}<line x1="${left}" y1="${base}" x2="${right}" y2="${base}" class="histogram-axis"/>${labels}<text x="526" y="320" text-anchor="middle">Remaining jigs</text><text x="20" y="160" text-anchor="middle" transform="rotate(-90 20 160)">Number of puzzles</text>${total?'':'<text x="526" y="150" text-anchor="middle">Waiting for completed puzzles…</text>'}</svg>`;
}
export function renderJigHistogram(host:HTMLElement,counts:number[]){
  const total=counts.reduce((a,b)=>a+b,0);
  host.innerHTML=`<h2>Remaining jigs histogram</h2><p>${total.toLocaleString()} completed unique puzzles, including those outside the display filter.</p><div class="histogram-scroll">${histogramSvg(counts)}</div>`;
}
