import type { Tally } from './difficulty';
export function renderRating(element: HTMLElement, score: number, tally: Tally[], label = 'Difficulty rating') {
  element.replaceChildren();
  const heading=document.createElement('h3'); heading.textContent=`${label}: ${score.toLocaleString()}`; element.append(heading);
  const table=document.createElement('table');
  const header=document.createElement('tr');
  for(const text of ['Techniques','Steps']) {const th=document.createElement('th');th.textContent=text;header.append(th)}
  table.append(header);
  for(const entry of tally) {const row=document.createElement('tr');for(const value of [entry.name,entry.steps.join(', ')]) {const td=document.createElement('td');td.textContent=String(value);row.append(td)}table.append(row)}
  element.append(table);
}
