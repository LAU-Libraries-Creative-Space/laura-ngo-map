import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Pages has no application server. Produce a review-only static build while
// leaving app-source/ and the Windows/Vercel visitor counter unchanged.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const suppliedBase = process.argv[2] ?? process.env.BASE_PATH ?? '/laura-ngo-map/';
const base = '/' + suppliedBase.split('/').filter(Boolean).join('/') + '/';
const basePath = base === '//' ? '/' : base;
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(basePath) || basePath.split('/').some(p => p === '.' || p === '..')) throw Error('Use a URL path such as /laura-ngo-map/');

await import('./build.mjs');
const target = path.join(root, 'github-pages');
await fs.mkdir(target, {recursive: true});
await fs.cp(path.join(root, 'dist'), target, {recursive: true});
async function transform(directory) {
  for (const entry of await fs.readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await transform(file); continue; }
    if (!/\.(html|js|css)$/.test(entry.name)) continue;
    let source = await fs.readFile(file, 'utf8');
    // This includes both terrain and street-map workers, data and the LAU logo.
    source = source.replace(/(["'`])\/(assets|data)\/([^"'`\r\n]+)\1/g, (_, quote, folder, rest) => quote + basePath + folder + '/' + rest + quote);
    if (entry.name === 'index-C_9D0gYg.js') {
      const helper = 'return `/` + e;';
      if (!source.includes(helper)) throw Error('Expected the original Vite preload helper');
      source = source.replace(helper, 'return ' + JSON.stringify(basePath) + ' + e;');
      const start = source.indexOf('function Qe() {');
      const effect = source.indexOf('  (0, b.useEffect)(() => {', start);
      const render = source.indexOf('\n  return (0, j.jsxs)', effect);
      if (start < 0 || effect < start || render < effect || !source.slice(effect, render).includes("fetch('/api/visitors'")) throw Error('Expected the visitor counter component');
      source = source.slice(0, effect) + source.slice(render);
      source = source.replace('Anonymous browsers since counting began', 'Visitor tracking requires the shared counter service.');
      source = source.replace('Visitor count temporarily unavailable.', 'Visitor tracking is not enabled in this review preview.');
      if (source.includes("fetch('/api/visitors'")) throw Error('Static review must not call the missing server');
    }
    await fs.writeFile(file, source);
  }
}
await transform(target);
await fs.writeFile(path.join(target, '.nojekyll'), '');
const records = JSON.parse(await fs.readFile(path.join(target, 'data/ngos.json'), 'utf8'));
if (records.length !== 63) throw Error('Missing NGO data');
console.log(`GitHub Pages review prepared at ${basePath}: 63 NGOs, 3D atlas and street map. Shared visitor tracking is disabled only in this static review.`);
