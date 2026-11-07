import type { Tally } from './difficulty';
export function renderRating(element: HTMLElement, score: number, tally: Tally[], label = 'Difficulty rating', onStep?: (step: number) => void) {
  element.replaceChildren();
  const heading=document.createElement('h3'); heading.textContent=`${label}: ${score.toLocaleString()}`; element.append(heading);
  const table=document.createElement('table');
  const header=document.createElement('tr');
  for(const text of ['Techniques','Steps']) {const th=document.createElement('th');th.textContent=text;header.append(th)}
  table.append(header);
  for (const entry of tally) {
    const row = document.createElement('tr'), technique = document.createElement('td'), steps = document.createElement('td');
    technique.textContent = entry.name;
    entry.steps.forEach((step, index) => {
      if (index) steps.append(', ');
      if (!onStep) { steps.append(String(step)); return; }
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'step-link'; button.textContent = String(step);
      button.setAttribute('aria-label', 'Go to step ' + step + ': ' + entry.name);
      button.addEventListener('click', () => onStep(step)); steps.append(button);
    });
    row.append(technique, steps); table.append(row);
  }
  element.append(table);
}
