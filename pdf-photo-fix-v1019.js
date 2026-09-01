/* FieldVerify Pro v10.25.45 - memory-safe photo link repair.
   IMPORTANT: never scan the whole photo store automatically on iPad startup. */
(()=>{
'use strict';
const PATCH_VERSION='10.25.45-safe-photo-repair';
if(typeof openDB!=='function'||typeof rec!=='function')return;
const photoNumber=p=>p?.caisson??p?.number??p?.itemNumber??p?.item??p?.item_key??null;
const unique=a=>[...new Set((a||[]).filter(Boolean).map(String))];
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function recoverPhotoLinks(options={}){
  const quiet=!!options.quiet;
  if(typeof activeProjectId!=='undefined'&&activeProjectId!=='legacy')return{repaired:0,found:0};
  const db=await openDB(),tx=db.transaction('photos','readonly'),store=tx.objectStore('photos');
  const byItem=new Map();let found=0;
  await new Promise((resolve,reject)=>{
    const q=store.openCursor();
    q.onerror=()=>reject(q.error);
    q.onsuccess=()=>{const c=q.result;if(!c){resolve();return}const p=c.value;found++;const raw=photoNumber(p);if(p?.id&&raw!=null){const k=String(raw);if(!byItem.has(k))byItem.set(k,[]);byItem.get(k).push(String(p.id))}c.continue()};
  });
  await txDone(tx).catch(()=>{});
  let repaired=0;
  for(const [key,ids] of byItem){if(!records?.[key])continue;const current=rec(key),before=unique(current.photos),after=unique([...before,...ids]);if(after.length!==before.length){records[key]={...current,photos:after};repaired+=after.length-before.length}}
  if(repaired&&typeof persist==='function')persist();
  if(!quiet&&typeof toast==='function')toast(repaired?`Recovered ${repaired} saved photo link${repaired===1?'':'s'}`:`Photo links checked · ${found} stored photos`);
  return{repaired,found};
}
window.FieldVerifyPhotoRepair=recoverPhotoLinks;
window.FIELDVERIFY_SAFE_PHOTO_REPAIR={version:PATCH_VERSION,repair:()=>recoverPhotoLinks({quiet:false})};
console.info('FieldVerify memory-safe photo repair '+PATCH_VERSION+' loaded');
})();
