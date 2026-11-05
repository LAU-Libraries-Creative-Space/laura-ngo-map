import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createVisitorHandler} from '../server/visitor-counter.js';
import {createLocalVisitorStore} from '../server/local-visitors.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),web=path.join(root,'dist');
const handler=createVisitorHandler(createLocalVisitorStore(path.join(root,'.local/visitors.json')));
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const flag=process.argv.indexOf('--port'),port=Number(flag>=0?process.argv[flag+1]:process.env.PORT||47864);
http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname==='/api/visitors')return await handler(req,res);
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed')}
 const target=path.resolve(web,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!target.startsWith(web+path.sep)){res.writeHead(403);return res.end('Forbidden')}
 const body=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-LAURA-App':'food-donation'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log(`LAURA Food Donation — supplied v1.2 folder\nLocal: http://127.0.0.1:${port}/`));
