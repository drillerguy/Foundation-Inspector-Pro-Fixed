/* FieldVerify Pro v10.24 - cloud photo download accelerator
   Downloads only missing photos and pulls several at the same time. JPEG/PNG
   photos are already compressed, so ZIP bundling usually saves little data
   while adding unzip/memory cost on iPad/Safari.
   Also cleans invalid zero-byte local photo entries before a manual cloud sync
   so Supabase Storage is never asked to upload an empty body.
*/
(()=>{
'use strict';
const VERSION='10.24-cloud-photo-accelerator-5';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const CONCURRENCY=5;
let sb=null,running=false,lastPid='',lastRun=0,syncGuardBusy=false;
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function cloudId(){try{const p=typeof activeProject==='function'?activeProject():null;const id=p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):'');return id||''}catch{return''}}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
function req(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function localPhotoIds(){if(typeof openDB!=='function')return new Set();const db=await openDB(),tx=db.transaction('photos','readonly'),store=tx.objectStore('photos');let keys=[];if(store.getAllKeys)keys=await req(store.getAllKeys());else{const rows=await req(store.getAll());keys=(rows||[]).map(x=>x?.id)}await done(tx);return new Set((keys||[]).filter(Boolean).map(String))}
async function save(meta,blob){if(typeof openDB!=='function')return;if(!blob||typeof blob.size!=='number'||blob.size<=0)throw Error('Downloaded photo had no content');const db=await openDB(),tx=db.transaction('photos','readwrite');tx.objectStore('photos').put({id:String(meta.id),caisson:meta.item_key,name:meta.file_name||String(meta.id),type:meta.mime_type||blob.type||'image/jpeg',blob,date:meta.captured_at||meta.created_at,projectId:typeof activeProjectId!=='undefined'?activeProjectId:null});await done(tx)}
async function cleanInvalidLocalPhotos(){if(typeof openDB!=='function')return 0;const db=await openDB(),readTx=db.transaction('photos','readonly'),store=readTx.objectStore('photos'),rows=await req(store.getAll());await done(readTx);const bad=(rows||[]).filter(p=>p?.id&&p.blob&&typeof p.blob.size==='number'&&p.blob.size<=0);if(!bad.length)return 0;const tx=db.transaction('photos','readwrite'),out=tx.objectStore('photos');for(const p of bad)out.delete(String(p.id));await done(tx);console.warn(`FieldVerify removed ${bad.length} zero-byte local photo entr${bad.length===1?'y':'ies'} before sync`);try{toast(`${bad.length} empty photo entr${bad.length===1?'y':'ies'} repaired before cloud sync`)}catch{}return bad.length}
function status(text){const b=document.getElementById('fvCloudBtn');if(b){if(!b.dataset.photoAccelOld)b.dataset.photoAccelOld=b.textContent||'Cloud';b.textContent=text}}
function restoreStatus(){const b=document.getElementById('fvCloudBtn');if(b&&b.dataset.photoAccelOld){b.textContent=b.dataset.photoAccelOld;delete b.dataset.photoAccelOld}}
async function downloadOne(c,m){let lastErr=null;for(let attempt=0;attempt<2;attempt++){try{const dl=await c.storage.from('fieldverify').download(m.storage_path);if(dl.error)throw dl.error;if(dl.data&&dl.data.size>0){await save(m,dl.data);return true}throw Error('Downloaded photo had no content')}catch(e){lastErr=e;if(attempt===0)await new Promise(r=>setTimeout(r,250))}}console.warn('Photo accelerator download failed',m?.id,lastErr);return false}
async function run(force=false){const pid=cloudId();if(!pid||!navigator.onLine||running)return 0;const now=Date.now();if(!force&&pid===lastPid&&now-lastRun<12000)return 0;running=true;lastPid=pid;lastRun=now;try{const c=await client(),session=(await c.auth.getSession()).data.session;if(!session)return 0;const q=await c.from('fieldverify_photos').select('id,item_key,storage_path,file_name,mime_type,captured_at,created_at').eq('project_id',pid);if(q.error)throw q.error;const remote=q.data||[];if(!remote.length)return 0;const have=await localPhotoIds();const missing=remote.filter(x=>x?.id&&x?.storage_path&&!have.has(String(x.id)));if(!missing.length)return 0;let next=0,finished=0,saved=0;status(`Cloud: Photos 0/${missing.length}`);async function worker(){while(true){const i=next++;if(i>=missing.length)return;const ok=await downloadOne(c,missing[i]);if(ok)saved++;finished++;if(finished===missing.length||finished%3===0)status(`Cloud: Photos ${finished}/${missing.length}`)}}await Promise.all(Array.from({length:Math.min(CONCURRENCY,missing.length)},worker));restoreStatus();if(saved){try{toast(`${saved} cloud photo${saved===1?'':'s'} downloaded faster`)}catch{};try{if(typeof showTarget==='function'&&typeof selected!=='undefined'&&selected!=null)showTarget()}catch{}}return saved}catch(e){console.warn('Cloud photo accelerator',e);restoreStatus();return 0}finally{running=false}}
function queue(delay=150){setTimeout(()=>run(false),delay)}
function loadExtra(file,flag,version){if(window[flag]||document.querySelector(`script[data-fv-extra="${flag}"]`))return;const s=document.createElement('script');s.src=`./${file}?v=${version}`;s.async=false;s.dataset.fvExtra=flag;document.head.appendChild(s)}
function loadCaissonRfi(){loadExtra('caisson-rfi-info-v1024.js','FIELDVERIFY_CAISSON_RFI','10.24.1')}
function loadCaissonExcelDesign(){loadExtra('caisson-excel-design-v1025.js','FIELDVERIFY_CAISSON_EXCEL_DESIGN','10.25.1')}
function loadManagerDrawLock(){loadExtra('manager-draw-lock-v1024.js','FIELDVERIFY_MANAGER_DRAW_LOCK','10.24.1')}
async function guardManualSync(e){const b=e.target?.closest?.('#fvSyncNow');if(!b||b.dataset.fvSyncGuardBypass==='1'||syncGuardBusy)return;const original=b.onclick;if(typeof original!=='function')return;e.preventDefault();e.stopImmediatePropagation();syncGuardBusy=true;b.disabled=true;const oldText=b.textContent;b.textContent='Checking photos…';try{await cleanInvalidLocalPhotos();b.dataset.fvSyncGuardBypass='1';b.disabled=false;b.textContent=oldText;try{await original.call(b,e)}finally{delete b.dataset.fvSyncGuardBypass}}catch(err){console.error('Cloud sync guard',err);try{toast(`Cloud sync preparation failed: ${err.message||err}`)}catch{}}finally{syncGuardBusy=false;b.disabled=false;if(b.textContent==='Checking photos…')b.textContent=oldText}}
addEventListener('online',()=>run(true));
document.addEventListener('change',e=>{if(e.target?.id==='projectHeaderSelect')queue(120)});
document.addEventListener('click',guardManualSync,true);
document.addEventListener('click',e=>{if(e.target?.closest?.('.openProject,#fvCloudBtn,#projectHeaderSelect'))queue(250)},true);
setTimeout(()=>run(true),120);
setTimeout(()=>run(false),1800);
setTimeout(loadCaissonRfi,80);
setTimeout(loadCaissonExcelDesign,85);
setTimeout(loadManagerDrawLock,90);
window.FIELDVERIFY_CLOUD_PHOTO_ACCELERATOR={version:VERSION,run:()=>run(true),clean:cleanInvalidLocalPhotos,concurrency:CONCURRENCY};
console.info(`FieldVerify cloud photo accelerator ${VERSION} loaded (${CONCURRENCY} parallel downloads)`);
})();
