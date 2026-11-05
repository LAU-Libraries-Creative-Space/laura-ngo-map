// Shared aggregate counts; no NGO searches, contact details or visitor IDs are sent.
const ABACUS='https://abacus.jasoncameron.dev';
export function createVisitorTracker({provider='server',namespace,key,storage,locks,fetchImpl=globalThis.fetch}={}){
  const marker=`laura:counted-browser:${namespace}:${key}`;
  if(provider==='abacus'&&(!/^[A-Za-z0-9._-]+$/.test(namespace||'')||!/^[A-Za-z0-9._-]+$/.test(key||'')))throw Error('Invalid counter configuration');
  let visitPromise;
  async function request(action){
    const external=provider==='abacus';
    const url=external?`${ABACUS}/${action}/${namespace}/${key}`:'/api/visitors';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetchImpl(url,{method:external||action==='get'?'GET':'POST',credentials:external?'omit':'same-origin',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
      const data=await response.json();
      if(external&&action==='get'&&response.status===404&&data.error==='Key not found')return 0;
      if(!response.ok)throw Error('Visitor count is unavailable');
      const value=external?data.value:data.visitors;
      const count=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):NaN;
      if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid visitor count');
      return count;
    }finally{clearTimeout(timeout);}
  }
  const read=()=>request('get');
  async function recordBrowser(){
    if(provider!=='abacus')return request('hit');
    // If storage is blocked, read only; refreshing must not inflate the total.
    try{
      if(!storage||storage.getItem(marker)!==null)return read();
      storage.setItem(marker,'pending');
    }catch{return read();}
    // Keep an uncertain request marked pending. Retrying a hit after a lost
    // response could count the same visitor twice; later loads only read.
    const count=await request('hit');
    try{storage.setItem(marker,'1');}catch{}
    return count;
  }
  return {
    read,
    visit(){
      return visitPromise??=(locks?.request?locks.request(marker,recordBrowser):recordBrowser());
    }
  };
}
let browserTracker;
export function loadVisitorCount({refreshOnly=false}={}){
  if(!browserTracker){
    let storage;
    try{storage=globalThis.localStorage;}catch{}
    const meta=name=>globalThis.document?.querySelector(`meta[name="${name}"]`)?.content;
    browserTracker=createVisitorTracker({provider:meta('laura-visitor-counter')||'server',namespace:meta('laura-visitor-namespace'),key:meta('laura-visitor-key'),storage,locks:globalThis.navigator?.locks});
  }
  return refreshOnly?browserTracker.read():browserTracker.visit();
}
