import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Pages uses a public aggregate counter; Windows/server builds use their own API.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const suppliedBase = process.argv[2] ?? process.env.BASE_PATH ?? '/laura-ngo-map/';
const base = '/' + suppliedBase.split('/').filter(Boolean).join('/') + '/';
const basePath = base === '//' ? '/' : base;
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(basePath) || basePath.split('/').some(p => p === '.' || p === '..')) throw Error('Use a URL path such as /laura-ngo-map/');

await import('./build.mjs');
const target = path.join(root, 'github-pages');
await fs.mkdir(target, {recursive: true});
const actualRoot=await fs.realpath(root),actualTarget=await fs.realpath(target);
if(path.dirname(actualTarget)!==actualRoot||path.basename(actualTarget)!=='github-pages')throw Error('Unsafe generated-output path');
await fs.rm(actualTarget,{recursive:true,force:true});
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
    }
    if(entry.name==='index.html')source=source.replace('</head>','<meta name="laura-visitor-counter" content="abacus"><meta name="laura-visitor-namespace" content="lau-libraries-creative-space"><meta name="laura-visitor-key" content="laura-map-visitors-20261105"></head>');
    await fs.writeFile(file, source);
  }
}
await transform(target);
// Publish a content-versioned module graph, including circular chunk imports.
// Unversioned aliases remain for browsers that still have an earlier HTML page.
const assets=path.join(target,'assets');
const names=(await fs.readdir(assets)).filter(name=>/\.(js|css)$/.test(name)).sort();
const digest=createHash('sha256').update(basePath);
for(const name of names)digest.update(name).update((await fs.readFile(path.join(assets,name),'utf8')).replace(/\r\n/g,'\n'));
const revision=digest.digest('hex').slice(0,12);
const versions=new Map(names.map(name=>[name,name.replace(/\.(js|css)$/,`-${revision}.$1`)]));
const versionLinks=text=>{for(const [name,version]of versions)text=text.replaceAll(name,version);return text;};
for(const name of names)await fs.writeFile(path.join(assets,versions.get(name)),versionLinks(await fs.readFile(path.join(assets,name),'utf8')));
const indexFile=path.join(target,'index.html');
await fs.writeFile(indexFile,versionLinks(await fs.readFile(indexFile,'utf8')));
await fs.writeFile(path.join(target,'build-info.json'),JSON.stringify({revision,basePath,main:versions.get('index-C_9D0gYg.js'),stylesheet:versions.get('index-iZUFSccV.css'),visitorClient:versions.get('visitor-tracking.js')}));
await fs.writeFile(path.join(target, '.nojekyll'), '');
const records = JSON.parse(await fs.readFile(path.join(target, 'data/ngos.json'), 'utf8'));
if (records.length !== 63) throw Error('Missing NGO data');
console.log(`GitHub Pages review prepared at ${basePath}: 63 NGOs, 3D atlas, street map and shared estimated visitor tracking.`);
