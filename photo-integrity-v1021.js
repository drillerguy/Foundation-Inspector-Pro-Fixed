/* FieldVerify Pro v10.25.45 - memory-safe photo integrity helper.
   No automatic all-photo scan. Audits run only when explicitly requested. */
(()=>{
'use strict';
const BUILD='10.25.45-safe-photo-integrity';
const unique=v=>[...new Set((v||[]).filter(Boolean).map(String))];
const photoNumber=p=>p?.caisson??p?.number??p?.itemNumber??p?.item??p?.item_key??null;
function recordPhotoIds(source=records){return unique(Object.values(source||{}).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]))}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function scanMetadata(){
  if(typeof openDB!=='function')return{ids:new Set(),byItem:new Map(),count:0};
  const db=await openDB(),tx=db.transaction('photos','readonly'),store=tx.objectStore('photos'),ids=new Set(),byItem=new Map();let count=0;
  await new Promise((resolve,reject)=>{const q=store.openCursor();q.onerror=()=>reject(q.error);q.onsuccess=()=>{const c=q.result;if(!c){resolve();return}const p=c.value;count++;if(p?.id){const id=String(p.id);ids.add(id);const raw=photoNumber(p);if(raw!=null){const k=String(raw);if(!byItem.has(k))byItem.set(k,[]);byItem.get(k).push(id)}}c.continue()}});
  await txDone(tx).catch(()=>{});return{ids,byItem,count};
}
async function repairLinksFromDevice(){const scan=await scanMetadata();let repaired=0;for(const [n,ids] of scan.byItem){if(!records?.[n])continue;const before=unique(records[n].photos),after=unique([...before,...ids]);if(after.length!==before.length){records[n]={...records[n],photos:after};repaired+=after.length-before.length}}if(repaired&&typeof persist==='function')persist();return{stored:scan.count,repaired}}
async function auditPhotoState(){const scan=await scanMetadata(),refs=recordPhotoIds(records),missing=refs.filter(id=>!scan.ids.has(id));return{refs:refs.length,stored:scan.count,missing,repaired:0}}
if(typeof savePhotos==='function'&&!window.__fvSafePhotoStamp){window.__fvSafePhotoStamp=true;const previous=savePhotos;savePhotos=async function(n,files){const result=await previous.apply(this,arguments);try{const ids=unique(records?.[String(n)]?.photos),active=typeof activeProjectId!=='undefined'?String(activeProjectId||'legacy'):'legacy',db=await openDB(),tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos');for(const id of ids){const q=store.get(id);q.onsuccess=()=>{const row=q.result;if(row&&row.projectId==null)store.put({...row,projectId:active})}}await txDone(tx)}catch(e){console.warn('Photo project stamp skipped',e)}return result}}
window.FieldVerifyPhotoIntegrity={audit:auditPhotoState,repair:repairLinksFromDevice,version:BUILD};
console.info('FieldVerify memory-safe photo integrity '+BUILD+' loaded');
})();
