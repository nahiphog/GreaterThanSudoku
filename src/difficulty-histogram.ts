import { histogramSvg } from './jig-histogram';

export type DifficultyHistogram={width:number;counts:number[]};
export function createDifficultyHistogram():DifficultyHistogram{return {width:500,counts:Array(20).fill(0)};}
/** Merge adjacent bins when the range grows, preserving every recorded puzzle. */
export function recordDifficulty(histogram:DifficultyHistogram,score:number){
  if(!Number.isSafeInteger(score)||score<0)throw new Error('Invalid difficulty rating.');
  while(score>=histogram.width*histogram.counts.length){
    const merged=histogram.counts.map(()=>0);
    histogram.counts.forEach((count,i)=>merged[Math.floor(i/2)]+=count);
    histogram.counts=merged;histogram.width*=2;
  }
  histogram.counts[Math.floor(score/histogram.width)]++;
}
export function difficultyHistogramSvg(histogram:DifficultyHistogram){
  return histogramSvg(histogram.counts,{
    axis:'Difficulty rating',
    tick:i=>(i*histogram.width).toLocaleString(),
    label:i=>`${(i*histogram.width).toLocaleString()}–${((i+1)*histogram.width-1).toLocaleString()}`,
  });
}
export function renderDifficultyHistogram(host:HTMLElement,histogram:DifficultyHistogram){
  const total=histogram.counts.reduce((a,b)=>a+b,0);
  host.innerHTML=`<h2>Difficulty rating histogram</h2><p>${total.toLocaleString()} completed unique puzzles, including those outside the display filter. Each bar covers ${histogram.width.toLocaleString()} rating points; ranges expand automatically.</p><div class="histogram-scroll">${difficultyHistogramSvg(histogram)}</div>`;
}
