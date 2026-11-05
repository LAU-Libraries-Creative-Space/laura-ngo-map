import fs from 'node:fs/promises';
import path from 'node:path';

export function createLocalVisitorStore(file){let queue=Promise.resolve();return function store(id,increment){const operation=queue.then(async()=>{
 let data;try{data=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;data={browsers:{}}}
 if(!data.browsers||typeof data.browsers!=='object'||Array.isArray(data.browsers))throw Error('Invalid local visitor data');
 if(increment&&!Object.hasOwn(data.browsers,id)){data.browsers[id]=true;await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(data),'utf8');await fs.rename(file+'.tmp',file)}
 return Object.keys(data.browsers).length;
 });queue=operation.catch(()=>{});return operation;}}
