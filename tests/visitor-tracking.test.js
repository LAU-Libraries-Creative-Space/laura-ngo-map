import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitorTracker} from '../app-source/assets/visitor-tracking.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
function fixture(){let count=0;const calls=[];return {calls,count:()=>count,fetchImpl:async(url,options)=>{calls.push({url,options});if(url.includes('/hit/'))count++;return Response.json({value:count});}};}
test('First browser counts once; reloads and refresh reads do not increment',async()=>{
 const service=fixture(),browser=storage();const settings={provider:'abacus',namespace:'test',key:'visitors',storage:browser,fetchImpl:service.fetchImpl};
 const tracker=createVisitorTracker(settings);assert.deepEqual(await Promise.all([tracker.visit(),tracker.visit()]),[1,1]);
 assert.equal(await tracker.read(),1);assert.equal(await createVisitorTracker(settings).visit(),1);assert.equal(service.count(),1);
 assert.equal(await createVisitorTracker({...settings,storage:storage()}).visit(),2);
 assert.ok(service.calls.every(call=>call.options.credentials==='omit'&&call.options.referrerPolicy==='no-referrer'));
});
test('Browser lock deduplicates simultaneous tabs',async()=>{
 const service=fixture(),browser=storage();let queue=Promise.resolve();const locks={request(_key,work){const next=queue.then(work);queue=next.catch(()=>{});return next;}};
 const settings={provider:'abacus',namespace:'test',key:'tabs',storage:browser,locks,fetchImpl:service.fetchImpl};
 await Promise.all([createVisitorTracker(settings).visit(),createVisitorTracker(settings).visit()]);assert.equal(service.count(),1);
});
test('Blocked browser storage uses read-only requests',async()=>{
 const service=fixture();const tracker=createVisitorTracker({provider:'abacus',namespace:'test',key:'blocked',storage:{getItem(){throw Error('blocked');}},fetchImpl:service.fetchImpl});
 assert.equal(await tracker.visit(),0);assert.equal(service.count(),0);assert.ok(service.calls[0].url.includes('/get/'));
});
test('Network failures and malformed responses never become invented counts or repeated hits',async()=>{
 const browser=storage();const options={provider:'abacus',namespace:'test',key:'failed',storage:browser};let hits=0;
 const bad=async url=>{if(url.includes('/hit/'))hits++;throw Error('lost response');};
 await assert.rejects(createVisitorTracker({...options,fetchImpl:bad}).visit());
 const recovered=createVisitorTracker({...options,fetchImpl:async url=>{assert.ok(url.includes('/get/'));return Response.json({value:7});}});
 assert.equal(await recovered.visit(),7);assert.equal(hits,1);
 for(const value of [-1,'not a number',null,3.5])await assert.rejects(createVisitorTracker({...options,fetchImpl:async()=>Response.json({value})}).read());
});
test('Server build retains the same-origin POST counter and read-only GET refresh',async()=>{
 const calls=[];const tracker=createVisitorTracker({fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({visitors:4});}});
 assert.equal(await tracker.visit(),4);assert.equal(await tracker.read(),4);
 assert.deepEqual(calls.map(call=>call.options.method),['POST','GET']);assert.ok(calls.every(call=>call.url==='/api/visitors'&&call.options.credentials==='same-origin'));
});
