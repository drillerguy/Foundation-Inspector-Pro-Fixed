/* FieldVerify Pro v10.24 - legacy multi-page PDF migration
   Converts old 8+ page drawing sets that stored the full PDF once per page
   into the new shared-source format without loading every duplicate blob.
*/
(()=>{
'use strict';
const VERSION='10.24-legacy-pdf-migrate-1';
const META_KEY='fieldVerifyDrawingLibraryV1024';
function read(){try{const x=JSON.parse(localStorage.getItem(META_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function save(x){localStorage.setItem(META_KEY,JSON.stringify(x))}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function getSetting(id){const db=await openDB(),tx=db.transaction('settings','readonly'),q=tx.objectStore('settings').get(id),v=await req(q);await done(tx);return v}
async function putSetting(v){const db=await openDB(),tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(v);await done(tx)}
async function deleteSettings(ids){const db=await openDB(),tx=db.transaction('settings','readwrite'),s=tx.objectStore('settings');for(const id of ids)s.delete(id);await done(tx)}
function isPdfItem(x){return x?.blob&&(x.type==='application/pdf'||String(x.name||'').toLowerCase().endsWith('.pdf'))}
async function migrate(){if(typeof openDB!=='function')return;let rows=read(),changed=false;const groups=new Map();for(const r of rows){if(r.sourceId||Number(r.pageCount)<8||!r.groupId)continue;const key=String(r.groupId);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}for(const group of groups.values()){if(group.length<2)continue;group.sort((a,b)=>(Number(a.pageNumber)||0)-(Number(b.pageNumber)||0));let first;try{first=await getSetting(group[0].id)}catch{continue}if(!isPdfItem(first))continue;const sourceId=`fieldverify-drawing-source:${group[0].projectId||'legacy'}:${String(group[0].category||'custom').toLowerCase()}:migrated:${Date.now()}:${Math.random().toString(36).slice(2,7)}`;try{await putSetting({id:sourceId,name:first.name||group[0].name||'Drawing.pdf',type:'application/pdf',blob:first.blob,pageCount:Number(first.pageCount)||Number(group[0].pageCount)||group.length,date:first.date||new Date().toISOString(),sharedPdfSource:true,migratedFromLegacy:true});const ids=new Set(group.map(x=>x.id));rows=rows.map(r=>ids.has(r.id)?{...r,sourceId,sharedPdf:true,baseDescription:r.baseDescription||String(r.description||r.name||'Drawing').replace(/\s*·\s*Page\s+\d+.*$/i,'')}:r);save(rows);await deleteSettings([...ids]);changed=true;try{toast(`Optimized ${group.length}-page drawing to prevent Safari crashes`)}catch{}}catch(e){console.warn('Large drawing migration skipped',e)}}if(changed){try{const cat=document.getElementById('itemFilter')?.value;document.getElementById('itemFilter')?.dispatchEvent(new Event('change',{bubbles:true}));console.info('Legacy drawing PDF storage optimized',cat)}catch{}}}
setTimeout(()=>migrate().catch(e=>console.warn('Legacy PDF migration',e)),2200);
window.FIELDVERIFY_LEGACY_PDF_MIGRATE={version:VERSION,run:migrate};
})();