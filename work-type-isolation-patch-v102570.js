(()=>{
'use strict';
const VERSION='10.25.70-work-type-isolation';
const API=()=>window.FIELDVERIFY_ITEM_IDENTITY;
const filter=()=>document.getElementById('itemFilter');
function say(s){try{toast(s)}catch{}}
function typeNow(){return String(filter()?.value||'').trim()}
function display(n){return `E-${n}`}
function safeSelect(type,n){
 const api=API();if(!api||!(type==='ERS'||type==='Tieback'))return false;
 const label=display(n),seed=api.seed(type,n,label),key=seed.key;
 try{
  if(typeof records==='undefined')return false;
  records[key]={...seed.record,itemType:type,itemLabel:label,canonicalItemKey:api.canonical(type,label,n),sourceNumber:n,updated:new Date().toISOString()};
  if(typeof persist==='function')persist();
  if(typeof selected!=='undefined')selected=key;
  if(typeof nearest!=='undefined')nearest=null;
  const q=document.getElementById('search');if(q)q.value=label;
  if(typeof showTarget==='function')showTarget();
  window.FIELDVERIFY_ERS_STATUS_BOXES?.refreshStates?.();
  say(`${type==='ERS'?'Sheet Number':'Tieback'} ${label} selected`);
  return true;
 }catch(e){console.warn('FieldVerify type-safe select failed',e);return false}
}
function numberFromButton(b){const d=Number(b?.dataset?.n);if(Number.isInteger(d))return d;const m=String(b?.textContent||'').match(/\d{1,4}/);return m?Number(m[0]):NaN}
document.addEventListener('click',e=>{
 const type=typeNow();if(!(type==='ERS'||type==='Tieback'))return;
 const b=e.target?.closest?.('.fv-ers-hit,.fv-page-virtual,#fvReadableNumbers button');if(!b)return;
 const n=numberFromButton(b);if(!Number.isInteger(n))return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();safeSelect(type,n);
},true);
function recordSafeName(n,r){
 try{
  const rt=String(r?.itemType||((typeof itemType==='function')?itemType(r):'Caisson')||'Caisson');
  const id=String(r?.itemLabel||'').trim()||String(r?.sourceNumber??n);
  if(rt==='ERS')return `Sheet Number ${id}`;
  if(rt==='Tieback')return `Tieback ${id}`;
  if(rt==='Waler')return `Waler ${id}`;
  if(rt==='Caisson')return `Caisson ${id}`;
  return `${rt} ${id}`;
 }catch{return String(n)}
}
try{if(typeof itemName==='function')itemName=recordSafeName}catch(e){console.warn('FieldVerify type-safe label override failed',e)}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function stampPhotos(ids,key,r){if(!ids?.length||typeof openDB!=='function')return;const api=API(),type=String(r?.itemType||'Caisson'),label=String(r?.itemLabel||''),canonical=api?.canonical(type,label,r?.sourceNumber??key)||`${type}:${label||key}`;const db=await openDB();for(const id of ids){try{const rt=db.transaction('photos','readonly'),row=await req(rt.objectStore('photos').get(String(id)));await done(rt).catch(()=>{});if(!row)continue;const wt=db.transaction('photos','readwrite'),store=wt.objectStore('photos');store.put({...row,projectId:String(typeof activeProjectId!=='undefined'?activeProjectId:'legacy'),itemKey:String(key),itemType:type,itemLabel:label,canonicalItemKey:canonical,sourceNumber:r?.sourceNumber??null});await done(wt)}catch(e){console.warn('FieldVerify photo metadata stamp failed',id,e)}}}
function wrapSavePhotos(){if(window.__fvWorkTypePhotoStamp||typeof savePhotos!=='function')return;window.__fvWorkTypePhotoStamp=true;const old=savePhotos;savePhotos=async function(n,files){const before=new Set((typeof rec==='function'?rec(n)?.photos:records?.[n]?.photos)||[]);const out=await old.apply(this,arguments);try{const r=typeof rec==='function'?rec(n):records?.[n]||{},after=(r?.photos||[]).map(String),added=after.filter(id=>!before.has(id));await stampPhotos(added,n,r)}catch(e){console.warn('FieldVerify photo identity stamp failed',e)}return out}}
wrapSavePhotos();setTimeout(wrapSavePhotos,1200);setTimeout(wrapSavePhotos,4000);
window.FIELDVERIFY_WORK_TYPE_ISOLATION={version:VERSION,safeSelect,recordSafeName};
console.info(`FieldVerify work-type isolation ${VERSION} loaded`);
})();
