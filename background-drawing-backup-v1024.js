/* FieldVerify Pro v10.24 - background drawing backup protection
   Ensures every project background drawing is included in device backups and
   uploaded to hosted project assets during background/manual backup activity.
*/
(()=>{
'use strict';
const VERSION='10.24-background-drawing-backup-1';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const DRAWING_META_KEY='fieldVerifyDrawingLibraryV1024';
let sb=null,lastHostedHash='',hostTimer=null;
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readJson(k,f){try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}}
function dbReq(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
function blobToData(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function dataToBlob(data){const [h,b]=String(data).split(',');const type=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const raw=atob(b||''),u=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);return new Blob([u],{type})}
function projectCloudId(){try{const p=typeof activeProject==='function'?activeProject():null;const x=p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):'');return x||''}catch{return''}}
function isDrawingSetting(x){if(!x?.blob)return false;const t=String(x.type||x.blob.type||'').toLowerCase();return t.includes('pdf')||t.startsWith('image/')||String(x.id||'').toLowerCase().includes('drawing')}
async function drawingSettings(){if(typeof openDB!=='function')return[];const db=await openDB(),tx=db.transaction('settings','readonly');const rows=await dbReq(tx.objectStore('settings').getAll());await txDone(tx);return (rows||[]).filter(isDrawingSetting)}
function metaFor(id){const rows=readJson(DRAWING_META_KEY,[]);return rows.find(x=>String(x.id)===String(id))||null}
function ext(type,name=''){const t=String(type||'').toLowerCase();if(t.includes('pdf'))return'pdf';if(t.includes('png'))return'png';if(t.includes('webp'))return'webp';if(t.includes('gif'))return'gif';if(t.includes('jpeg')||t.includes('jpg'))return'jpg';const m=String(name).match(/\.([a-z0-9]+)$/i);return m?m[1].toLowerCase():'bin'}
function simpleHash(rows){return rows.map(x=>`${x.id}|${x.name||''}|${x.date||''}|${x.blob?.size||0}|${x.blob?.type||''}`).sort().join('~')}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
async function uploadAllBackgroundDrawings(force=false){
 if(!navigator.onLine)return 0;const pid=projectCloudId();if(!pid)return 0;const rows=await drawingSettings();if(!rows.length)return 0;
 const hash=simpleHash(rows);if(!force&&hash===lastHostedHash)return 0;const c=await client();const ses=(await c.auth.getSession()).data.session;if(!ses)return 0;
 let done=0;
 for(const d of rows){const m=metaFor(d.id),suffix=ext(d.type||d.blob.type,d.name),path=`${pid}/drawings/${encodeURIComponent(String(d.id))}.${suffix}`;
  const up=await c.storage.from('fieldverify').upload(path,d.blob,{upsert:true,contentType:d.type||d.blob.type||'application/octet-stream'});if(up.error)throw up.error;
  const existing=await c.from('fieldverify_project_assets').select('id').eq('project_id',pid).eq('asset_type','drawing').eq('storage_path',path).maybeSingle();if(existing.error)throw existing.error;
  const row={project_id:pid,asset_type:'drawing',storage_path:path,file_name:d.name||m?.name||m?.description||'Background drawing',metadata:{drawing_id:String(d.id),category:m?.category||'Custom',description:m?.description||d.name||'Background drawing',pageNumber:d.pageNumber||1,pageCount:d.pageCount||1,mime_type:d.type||d.blob.type||'',background_drawing:true}};
  const q=existing.data?await c.from('fieldverify_project_assets').update(row).eq('id',existing.data.id):await c.from('fieldverify_project_assets').insert(row);if(q.error)throw q.error;done++;
 }
 lastHostedHash=hash;return done;
}

// Device backups: embed every stored background drawing, not only records/photos.
if(typeof buildProjectBackup==='function'){
 const originalBuild=buildProjectBackup;
 buildProjectBackup=async function buildWithBackgroundDrawings(){
  const built=await originalBuild();const payload=built?.payload||built;if(!payload||typeof payload!=='object')return built;
  const rows=await drawingSettings(),out=[];
  for(const d of rows){try{out.push({id:String(d.id),name:d.name||'Background drawing',type:d.type||d.blob.type||'application/octet-stream',date:d.date||new Date().toISOString(),pageNumber:d.pageNumber||1,pageCount:d.pageCount||1,meta:metaFor(d.id),data:await blobToData(d.blob)})}catch(e){console.warn('Could not embed drawing',d.id,e)}}
  payload.backgroundDrawings=out;payload.backgroundDrawingCount=out.length;payload.includesBackgroundDrawings=true;
  return built?.payload?{...built,payload}:payload;
 };
}

// Device restore: put embedded drawings back into IndexedDB before the normal restore finishes.
const restoreInput=document.getElementById('restoreInput');
if(restoreInput&&restoreInput.onchange){
 const oldRestore=restoreInput.onchange;
 restoreInput.onchange=async function restoreWithBackgroundDrawings(e){
  const files=[...(e.target.files||[])];
  try{
   for(const f of files){if(!String(f.name||'').toLowerCase().endsWith('.json'))continue;let j;try{j=JSON.parse(await f.text())}catch{continue}const rows=Array.isArray(j?.backgroundDrawings)?j.backgroundDrawings:[];if(!rows.length)continue;
    const db=await openDB(),tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings');for(const d of rows){if(!d?.id||!d?.data)continue;store.put({id:String(d.id),name:d.name||'Restored background drawing',type:d.type||'',date:d.date||new Date().toISOString(),pageNumber:d.pageNumber||1,pageCount:d.pageCount||1,blob:dataToBlob(d.data)})}await txDone(tx);
    const metas=rows.map(x=>x.meta).filter(Boolean),existing=readJson(DRAWING_META_KEY,[]);if(metas.length)localStorage.setItem(DRAWING_META_KEY,JSON.stringify([...existing.filter(x=>!metas.some(m=>String(m.id)===String(x.id))),...metas]));
   }
  }catch(err){console.warn('Background drawing restore prep failed',err)}
  const result=await oldRestore.call(this,e);try{await applyStoredDrawing?.()}catch{};return result;
 };
}

// Manual hosting backups route through FIELDVERIFY_HOSTED_BACKUP; ensure the
// background drawing is pushed immediately as part of that same user action.
function hookHosted(){const h=window.FIELDVERIFY_HOSTED_BACKUP;if(!h||h.__backgroundHooked)return;h.__backgroundHooked=true;const oldBackup=h.backup;h.backup=async(...a)=>{try{await uploadAllBackgroundDrawings(true)}catch(e){console.warn('Background drawing host backup',e)}return oldBackup(...a)};const oldAuto=h.autosave;h.autosave=async(...a)=>{try{await uploadAllBackgroundDrawings(true)}catch(e){console.warn('Background drawing host autosave',e)}return oldAuto(...a)}}
function queueHost(){clearTimeout(hostTimer);hostTimer=setTimeout(()=>uploadAllBackgroundDrawings(false).catch(e=>console.warn('Background drawing autosave',e)),4500)}
try{const p=persist;persist=function(){p();queueHost()}}catch{}
try{const n=persistNcr;persistNcr=function(){n();queueHost()}}catch{}
try{const s=savePhotos;savePhotos=async function(...a){const x=await s(...a);queueHost();return x}}catch{}
setInterval(()=>{hookHosted();uploadAllBackgroundDrawings(false).catch(()=>{})},12000);addEventListener('online',queueHost);setTimeout(()=>{hookHosted();queueHost()},2500);
window.FIELDVERIFY_BACKGROUND_DRAWING_BACKUP={version:VERSION,sync:()=>uploadAllBackgroundDrawings(true)};
console.info(`FieldVerify background drawing backup ${VERSION} loaded`);
})();
