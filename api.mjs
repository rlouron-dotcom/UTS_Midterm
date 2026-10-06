import {getStore} from '@netlify/blobs';
import bank from './bank.mjs';
import codes from './codes.mjs';
const MIN=+process.env.MINUTES||60,MAX=+process.env.MAX_STRIKES||3,PTS=2,GRACE=8000;
const OPEN=process.env.OPENS?Date.parse(process.env.OPENS):0,CLOSE=process.env.CLOSES?Date.parse(process.env.CLOSES):0;
const j=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const rnd=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const shuf=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const k=Math.floor(r()*(i+1));[a[i],a[k]]=[a[k],a[i]]}return a};
const questions=seed=>{const r=rnd(seed);return shuf(bank,r).map(q=>({id:q.id,q:q.q,o:shuf(q.o,r)}))};
const clean=a=>{const o={};if(a&&typeof a==='object')for(const q of bank)if(typeof a[q.id]==='string'&&q.o.includes(a[q.id]))o[q.id]=a[q.id];return o};
const score=a=>bank.filter(q=>a[q.id]===q.c).length*PTS;
const evs=e=>Array.isArray(e)?e.slice(0,400).map(x=>({t:+x?.t||0,k:String(x?.k||'').slice(0,40),s:x?.s?1:0})):[];
const deadline=a=>a.startedAt+MIN*60000;
const final=(a,reason)=>{a.submitted=true;a.submittedAt=Math.min(Date.now(),deadline(a));a.reason=reason;a.score=score(a.answers);return a};
const pay=(a,resumed)=>({status:'ok',name:a.name,sid:a.sid,serverNow:Date.now(),startedAt:a.startedAt,minutes:MIN,maxViol:MAX,questions:questions(a.seed),answers:a.answers,ev:a.ev,strikes:a.strikes,resumed});
const subm=a=>({status:'submitted',submitted:true,name:a.name,sid:a.sid,submittedAt:a.submittedAt,reason:a.reason});

export default async req=>{
 if(req.method!=='POST')return j({error:'POST only'},405);
 let b;try{b=await req.json()}catch{return j({error:'Bad request'},400)}
 const store=getStore('uts-attempts');
 try{
  if(b.action==='info')return j({minutes:MIN,maxViol:MAX,opens:OPEN||null,closes:CLOSE||null,items:bank.length});
  if(['list','reset'].includes(b.action)){
   if(!process.env.ADMIN_PASSWORD||b.pw!==process.env.ADMIN_PASSWORD){await new Promise(r=>setTimeout(r,800));return j({error:'Wrong password'},401)}
   if(b.action==='reset'){await store.delete(String(b.code));return j({ok:true})}
   const rows=await Promise.all(codes.map(async(c,i)=>{const a=await store.get(c,{type:'json'});
    if(!a)return{n:i+1,code:c,status:'not started'};
    const exp=!a.submitted&&Date.now()>deadline(a)+GRACE;
    return{n:i+1,code:c,name:a.name,sid:a.sid,sec:a.sec,status:a.submitted?'submitted':exp?'expired (unsubmitted)':'in progress',reason:a.reason||'',score:a.submitted?a.score:score(a.answers),strikes:a.strikes,answered:Object.keys(a.answers).length,min:Math.round(((a.submittedAt||Math.min(Date.now(),deadline(a)))-a.startedAt)/600)/100,started:a.startedAt,ev:a.ev}}));
   return j({rows,total:bank.length*PTS})}
  const code=String(b.code||'').trim().toUpperCase();
  if(!codes.includes(code))return j({error:'Invalid access code.'},403);
  let a=await store.get(code,{type:'json'});
  if(b.action==='start'){
   if(a){if(a.submitted)return j(subm(a));if(Date.now()>deadline(a)+GRACE){await store.setJSON(code,final(a,'Time expired (auto-submitted)'));return j(subm(a))}
    a.ev.push({t:Date.now(),k:'resumed',s:0});await store.setJSON(code,a);return j(pay(a,true))}
   const n=Date.now();if(OPEN&&n<OPEN)return j({error:'The exam has not opened yet.'},403);if(CLOSE&&n>CLOSE)return j({error:'The exam is closed.'},403);
   a={code,name:String(b.name||'').slice(0,80),sid:String(b.sid||'').slice(0,40),sec:String(b.sec||'').slice(0,60),seed:Math.floor(Math.random()*2147483647),startedAt:n,answers:{},ev:[],strikes:0,submitted:false};
   await store.setJSON(code,a);return j(pay(a,false))}
  if(!a)return j({error:'No attempt found.'},404);
  if(a.submitted)return j({...subm(a)});
  const late=Date.now()>deadline(a)+GRACE;
  if(!late){a.answers=clean(b.answers);a.ev=evs(b.ev);a.strikes=Math.max(0,Math.min(+b.strikes||0,99))}
  if(late||a.strikes>=MAX||b.action==='submit'){final(a,late?'Time expired (auto-submitted)':a.strikes>=MAX?'Auto-submitted: '+a.strikes+' integrity violations':String(b.reason||'Submitted by student').slice(0,100));await store.setJSON(code,a);return j(subm(a))}
  await store.setJSON(code,a);return j({ok:true,submitted:false})
 }catch(e){console.error(e);return j({error:'Server error. Please retry.'},500)}
};
export const config={path:'/api'};
