import { readFile, mkdir, writeFile } from 'node:fs/promises';
// Real directory entry points make clean URLs reloadable on GitHub Pages.
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
for (const page of ['generate', 'simulation', 'verify', 'custom-build']) {
  const directory = new URL(`../dist/${page}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), html);
}
