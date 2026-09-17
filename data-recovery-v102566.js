/* FieldVerify Pro v10.25.66 - non-destructive data recovery and safe photo import.
   Never overwrites record status/GPS/notes or an existing photo blob. */
(()=>{
'use strict';
const BUILD='10.25.66-recovery-1';
const unique=v=>[...new Set((v||[]).filter(Boolean).map(String))];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const photoItem=p=>p?.caisson??p?.number??p?.itemNumber??p?.item??p?.item_key??null;
let lastReport=null;

function say(s){try{toast(s)}catch{};console.info('[FieldVerify Recovery]',s)}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('IndexedDB request failed'))})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error||new Error('IndexedDB transaction failed'));tx.onabort=()=>rej(tx.error||new Error('IndexedDB transaction aborted'))})}
function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function blobHash(blob){if(!blob||!blob.size)return'';return hex(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))}
async function dataHash(data){if(typeof data!=='string'||!data)return'';return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data.replace(/\s/g,''))))}
function decodeDataUrl(value){
 const m=String(value||'').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);if(!m)throw Error('Invalid photo data');
 const type=m[1]||'image/jpeg',body=m[3]||'';
 if(m[2]){const bin=atob(body.replace(/\s/g,'')),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type})}
 return new Blob([decodeURIComponent(body)],{type});
}
function activePid(){try{return String(activeProjectId||'legacy')}catch{return'legacy'}}
function recordRefs(source){const out=new Map();for(const [n,r] of Object.entries(source||{})){for(const id of unique(r?.photos)){out.set(id,String(n))}}return out}

async function scanDevice(){
 say('Recovery scan: reading this device…');
 const refs=recordRefs(typeof records==='object'?records:{}),rows=[],byHash=new Map(),ids=new Set();
 if(typeof openDB!=='function')throw Error('Photo database is not available');
 const db=await openDB(),tx=db.transaction('photos','readonly'),store=tx.objectStore('photos');
 await new Promise((resolve,reject)=>{const q=store.openCursor();q.onerror=()=>reject(q.error);q.onsuccess=async()=>{const c=q.result;if(!c){resolve();return}const p=c.value||{},id=String(p.id||c.key||'');ids.add(id);let hash='';try{hash=await blobHash(p.blob)}catch{}const item=String(photoItem(p)??refs.get(id)??'');const row={id,item,projectId:String(p.projectId??''),bytes:Number(p.blob?.size||0),hash};rows.push(row);if(hash){if(!byHash.has(hash))byHash.set(hash,[]);byHash.get(hash).push(row)}if(rows.length%5===0){say(`Recovery scan: ${rows.length} stored photos checked`);await sleep(10)}c.continue()}})});
 await txDone(tx).catch(()=>{});
 const missing=[...refs.entries()].filter(([id])=>!ids.has(id)).map(([id,item])=>({id,item}));
 const orphan=rows.filter(r=>!refs.has(r.id));
 const duplicateGroups=[...byHash.entries()].map(([hash,a])=>({hash,photos:a,items:unique(a.map(x=>x.item))})).filter(g=>g.photos.length>1&&g.items.length>1);
 const report={created:new Date().toISOString(),projectId:activePid(),records:Object.keys(records||{}).length,referencedPhotos:refs.size,storedPhotos:rows.length,missingReferences:missing,orphanPhotos:orphan,duplicateImageGroups:duplicateGroups,photos:rows};
 lastReport={type:'device',...report};
 showReport(lastReport);
 say(`Recovery scan complete: ${rows.length} stored · ${missing.length} missing refs · ${duplicateGroups.length} repeated-image groups`);
 return report;
}

async function analyzeFiles(files){
 const results=[];for(let fi=0;fi<files.length;fi++){
  const f=files[fi];say(`Analyzing backup ${fi+1} of ${files.length}: ${f.name}`);let data;
  try{data=JSON.parse(await f.text())}catch(e){results.push({name:f.name,bytes:f.size,status:'UNREADABLE',error:String(e.message||e)});continue}
  const recs=(data.records&&typeof data.records==='object')?data.records:{},photos=Array.isArray(data.photos)?data.photos:[],refs=recordRefs(recs),byHash=new Map(),photoRows=[];
  for(let i=0;i<photos.length;i++){
   const p=photos[i]||{},id=String(p.id||''),item=String(photoItem(p)??refs.get(id)??''),hash=p.data?await dataHash(p.data):'',row={id,item,hash,hasData:!!p.data};photoRows.push(row);if(hash){if(!byHash.has(hash))byHash.set(hash,[]);byHash.get(hash).push(row)}if(i%8===7)await sleep(5);
  }
  const duplicates=[...byHash.entries()].map(([hash,a])=>({hash,ids:a.map(x=>x.id),items:unique(a.map(x=>x.item))})).filter(g=>g.ids.length>1&&g.items.length>1);
  const embedded=new Set(photoRows.filter(x=>x.hasData).map(x=>x.id));
  const missing=[...refs.entries()].filter(([id])=>!embedded.has(id)).map(([id,item])=>({id,item}));
  let status='SAFE PHOTO SOURCE';if(!photos.length)status='RECORDS ONLY';else if(duplicates.length)status='SUSPECT REPEATED IMAGES';else if(missing.length)status='PARTIAL PHOTO SOURCE';
  results.push({name:f.name,bytes:f.size,status,recordCount:Object.keys(recs).length,photoReferences:refs.size,embeddedPhotos:embedded.size,missingEmbedded:missing.length,duplicateImageGroups:duplicates.length,duplicates,missingReferences:missing});
 }
 lastReport={type:'backup-analysis',created:new Date().toISOString(),files:results};showReport(lastReport);return lastReport;
}

async function safeImportRecoveryFiles(files){
 // Photo-only merge. Never changes an existing record's status, GPS, notes, timestamps, inspection or history.
 const parsed=[];for(const f of files){let data;try{data=JSON.parse(await f.text())}catch(e){say(`${f.name}: unreadable`);continue}parsed.push({file:f,data})}
 const candidates=[],hashGroups=new Map();
 for(const {file,data} of parsed){const recs=(data.records&&typeof data.records==='object')?data.records:{},refs=recordRefs(recs);for(const p of (Array.isArray(data.photos)?data.photos:[])){if(!p?.id||!p?.data)continue;const id=String(p.id),item=String(photoItem(p)??refs.get(id)??''),hash=await dataHash(p.data),c={file:file.name,p,id,item,hash};candidates.push(c);if(hash){if(!hashGroups.has(hash))hashGroups.set(hash,[]);hashGroups.get(hash).push(c)}}}
 const suspectIds=new Set();for(const a of hashGroups.values()){const items=unique(a.map(x=>x.item));if(a.length>1&&items.length>1)for(const c of a)suspectIds.add(c.id)}
 if(!candidates.length){say('No embedded recovery photos found');return{saved:0,skipped:0,conflicts:0,suspect:0}}
 if(suspectIds.size){say(`Recovery protection: ${suspectIds.size} repeated-image photo IDs will be skipped`)}
 const db=await openDB();let saved=0,skipped=0,conflicts=0,suspect=0;
 for(let i=0;i<candidates.length;i++){
  const c=candidates[i];if(suspectIds.has(c.id)){suspect++;continue}
  const blob=decodeDataUrl(c.p.data),incomingHash=await blobHash(blob);
  const readTx=db.transaction('photos','readonly'),existing=await req(readTx.objectStore('photos').get(c.id));await txDone(readTx).catch(()=>{});
  if(existing?.blob){const oldHash=await blobHash(existing.blob);if(oldHash===incomingHash){skipped++;}else{conflicts++;console.warn('Recovery photo conflict blocked',c.id);continue}}
  else{
   const row={...c.p,blob,projectId:c.p.projectId??activePid()};delete row.data;
   const tx=db.transaction('photos','readwrite'),done=txDone(tx);await req(tx.objectStore('photos').put(row));await done;saved++;
  }
  if(c.item&&records?.[c.item]){const before=unique(records[c.item].photos);if(!before.includes(c.id)){records[c.item]={...records[c.item],photos:[...before,c.id]}}}
  if(i%3===2){if(typeof persist==='function')persist();say(`Recovering safe photos: ${saved} added · ${conflicts} conflicts blocked`);await sleep(15)}
 }
 if(typeof persist==='function')persist();if(typeof renderPins==='function')renderPins();
 const result={saved,skipped,conflicts,suspect,created:new Date().toISOString()};try{localStorage.setItem('fieldVerifyLastSafeRecovery',JSON.stringify(result))}catch{}
 say(`Safe recovery complete: ${saved} added · ${suspect} suspect skipped · ${conflicts} conflicts blocked`);return result;
}

function downloadReport(){if(!lastReport)return say('Run a recovery scan first');const name=`FieldVerify-Recovery-Report-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.json`,blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}
function modal(){document.getElementById('fvRecoveryModal')?.remove();const d=document.createElement('div');d.id='fvRecoveryModal';d.style.cssText='position:fixed;inset:0;z-index:1800;background:#000b;padding:14px;overflow:auto';d.innerHTML=`<div style="max-width:720px;margin:3vh auto;background:white;color:#15202b;border-radius:18px;padding:16px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h2 style="margin:0">FieldVerify Data Recovery</h2><button id="fvRecClose" style="padding:10px">Close</button></div><p style="color:#596775">Read-only scanning does not delete or replace project data. Safe photo recovery only adds verified missing photo blobs and links; it never rolls record status, GPS, notes or history backward.</p><button id="fvScanDevice" style="width:100%;padding:14px;margin:5px 0;background:#083a73;color:#fff;border-radius:12px;font-weight:900">SCAN THIS DEVICE</button><button id="fvAnalyzeBackups" style="width:100%;padding:14px;margin:5px 0;background:#e7edf4;color:#16202a;border-radius:12px;font-weight:900">ANALYZE BACKUP JSON FILES</button><button id="fvSafeImport" style="width:100%;padding:14px;margin:5px 0;background:#16803d;color:#fff;border-radius:12px;font-weight:900">RECOVER SAFE PHOTOS FROM JSON</button><button id="fvExportReport" style="width:100%;padding:14px;margin:5px 0;background:#e7edf4;color:#16202a;border-radius:12px;font-weight:900">EXPORT RECOVERY REPORT</button><input id="fvRecFiles" type="file" accept="application/json,.json" multiple style="display:none"><div id="fvRecOut" style="margin-top:12px"></div></div>`;document.body.appendChild(d);d.querySelector('#fvRecClose').onclick=()=>d.remove();d.querySelector('#fvScanDevice').onclick=()=>scanDevice().catch(e=>say(`Recovery scan failed: ${e.message||e}`));d.querySelector('#fvExportReport').onclick=downloadReport;const input=d.querySelector('#fvRecFiles');d.querySelector('#fvAnalyzeBackups').onclick=()=>{input.dataset.mode='analyze';input.value='';input.click()};d.querySelector('#fvSafeImport').onclick=()=>{input.dataset.mode='recover';input.value='';input.click()};input.onchange=async()=>{const files=[...(input.files||[])];if(!files.length)return;try{if(input.dataset.mode==='recover')await safeImportRecoveryFiles(files);else await analyzeFiles(files)}catch(e){say(`Recovery operation failed: ${e.message||e}`)}};return d}
function showReport(r){const out=document.getElementById('fvRecOut');if(!out)return;if(r.type==='device'){out.innerHTML=`<div style="padding:10px;background:#eef3f8;border-radius:12px"><b>Device Recovery Scan</b><br>Records: ${r.records}<br>Referenced photos: ${r.referencedPhotos}<br>Stored photos: ${r.storedPhotos}<br>Missing references: <b>${r.missingReferences.length}</b><br>Unlinked/orphan photos: <b>${r.orphanPhotos.length}</b><br>Repeated-image groups across different items: <b>${r.duplicateImageGroups.length}</b></div>`}else{out.innerHTML=r.files.map(f=>`<div style="padding:10px;margin:6px 0;background:#eef3f8;border-radius:12px"><b>${esc(f.name)}</b><br>${esc(f.status)}<br>Records ${f.recordCount||0} · refs ${f.photoReferences||0} · embedded ${f.embeddedPhotos||0} · missing ${f.missingEmbedded||0} · repeated groups ${f.duplicateImageGroups||0}</div>`).join('')}}
function bind(){const backup=document.getElementById('backupBtn');if(backup&&!document.getElementById('fvRecoveryBtn')){const b=document.createElement('button');b.id='fvRecoveryBtn';b.textContent='DATA RECOVERY';b.style.cssText='background:#7b3fc6!important;color:#fff!important;';b.onclick=e=>{e.preventDefault();e.stopPropagation();modal()};backup.insertAdjacentElement('afterend',b)}}
// Replace the older recovery-file handler with photo-only safe recovery for matching recovery JSONs.
function guardLegacyRecovery(){const input=document.getElementById('restoreInput');if(!input||input.dataset.safeRecoveryGuard)return;input.dataset.safeRecoveryGuard='1';const previous=input.onchange;input.onchange=async e=>{const files=[...(e.target.files||[])];const recovery=files.length&&files.every(f=>/^FieldVerify-(?:PDF-)?Photo-Recovery-/i.test(String(f.name||''))||/^FieldVerify-Additional-Photo-Recovery-/i.test(String(f.name||'')));if(recovery){e.preventDefault();try{await safeImportRecoveryFiles(files)}catch(err){say(`Safe recovery failed: ${err.message||err}`)}e.target.value='';return}if(typeof previous==='function')return previous.call(input,e)}}
const obs=new MutationObserver(()=>{bind();guardLegacyRecovery()});obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(()=>{bind();guardLegacyRecovery()},1500);setTimeout(()=>{bind();guardLegacyRecovery()},250);
window.FIELDVERIFY_DATA_RECOVERY={version:BUILD,scanDevice,analyzeFiles,safeImportRecoveryFiles,open:modal,getLastReport:()=>lastReport};
console.info('FieldVerify safe data recovery '+BUILD+' loaded');
})();
