import {randomUUID} from 'node:crypto';

const COOKIE='laura_visitor';
const YEAR=31536000;
const TOTAL='laura:visitors:total';
export const COUNT_SCRIPT="if redis.call('SET', KEYS[2], '1', 'NX', 'EX', ARGV[1]) then redis.call('INCR', KEYS[1]) end return tonumber(redis.call('GET', KEYS[1]) or '0')";
export function visitorId(cookie=''){const match=String(cookie).match(/(?:^|;\s*)laura_visitor=([a-f0-9-]{36})(?:;|$)/i);return match&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match[1])?match[1].toLowerCase():null}
export async function redisVisitors(id,increment,{env=process.env,fetchImpl=fetch}={}){
 const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
 if(!url||!token||!url.startsWith('https://'))throw Error('Visitor storage is not configured');
 const command=increment?['EVAL',COUNT_SCRIPT,'2',TOTAL,`laura:visitors:browser:${id}`,String(YEAR)]:['GET',TOTAL];
 const response=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Visitor storage is unavailable');const result=await response.json();if(result.error)throw Error('Visitor storage returned an error');
 const count=result.result===null?0:Number(result.result);if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid visitor count');return count;
}
export function createVisitorHandler(store=redisVisitors){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}))}
 if(req.method==='POST'){
  const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
  let foreign=req.headers['sec-fetch-site']==='cross-site';if(origin){try{foreign=foreign||new URL(origin).host!==host}catch{foreign=true}}
  if(foreign){res.statusCode=403;return res.end(JSON.stringify({error:'Cross-site requests are not accepted'}))}
 }
 const known=visitorId(req.headers.cookie);const id=known||randomUUID();
 try{const count=await store(id,req.method==='POST');if(req.method==='POST'&&!known){const secure=process.env.VERCEL||req.headers['x-forwarded-proto']==='https';res.setHeader('Set-Cookie',`${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${YEAR}${secure?'; Secure':''}`)}res.statusCode=200;res.end(JSON.stringify({visitors:count,metric:'anonymous-browsers'}))}catch{res.statusCode=503;res.end(JSON.stringify({error:'Visitor count temporarily unavailable'}))}
}}
