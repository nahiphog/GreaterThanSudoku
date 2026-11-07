/// <reference types="vite/client" />
export type Page = 'generate' | 'simulation' | 'verify' | 'custom-build';
export const pageUrl = (page:Page) => `${import.meta.env.BASE_URL}${page}/`;
export function currentPage(): Page {
  const last=location.pathname.replace(/\/+$/,'').split('/').pop();
  return last==='custom-build'?'custom-build':last==='verify'?'verify':last==='simulation'?'simulation':'generate';
}
function renderRoute() {
  const page=currentPage();
  for(const [route,id] of [['generate','home-page'],['simulation','simulation-page'],['verify','verify-page'],['custom-build','custom-build-page']]) {
    const main=document.getElementById(id);if(main)main.hidden=page!==route;
  }
  document.querySelectorAll<HTMLAnchorElement>('a[data-page]').forEach(link=>{
    if(link.dataset.page===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  document.title=`${page==='generate'?'Generate':page==='verify'?'Verify':page==='custom-build'?'Custom build':'Simulation difficulty'} — Greater than Sudoku`;
  window.dispatchEvent(new CustomEvent('pagechange',{detail:page}));
}
export function navigate(page:Page) {
  if(location.pathname!==pageUrl(page)||location.hash)history.pushState(null,'',pageUrl(page));
  renderRoute();window.scrollTo({top:0});
}
export function initNavigation() {
  // Keep older shared hash links working, then replace them with clean paths.
  const legacy=location.hash==='#simulation'?'simulation':location.hash==='#verify'?'verify':currentPage();
  history.replaceState(null,'',pageUrl(legacy));
  document.querySelectorAll<HTMLAnchorElement>('a[data-page]').forEach(link=>{
    link.href=pageUrl(link.dataset.page as Page);
    link.addEventListener('click',event=>{if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(link.dataset.page as Page)});
  });
  window.addEventListener('popstate',renderRoute);renderRoute();
}
