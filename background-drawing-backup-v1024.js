/* FieldVerify Pro v10.24 - background drawing backup protection
   Saves each source drawing once. Multi-page PDFs use one shared source blob
   plus page metadata instead of loading/duplicating the same PDF for every page.
*/
(()=>{
'use strict';
const VERSION='10.24-background-drawing-backup-2';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const DRAWING_META_KEY='fieldVerifyDrawingLibraryV1024';
let sb=null,lastHostedHash='';
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readJson(k,f){try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}}
function dbReq(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
function blobToData(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function dataToBlob(data){const [h,b]=String(data).split(',');const type=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const raw=atob(b||''),u=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);return new Blob([u],{type})}
function projectCloudId(){try{const p=typeof activeProject==='function'?activeProject():null;const x=p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):'');return x||''}catch{return''}}
function metas(){const x=readJson(DRAWING_META_KEY,[]);return Array.isArray(x)?x:[]}
function metaFor(id){return metas().find(x=>String(x.id)===String(id))||null}
function projectId(){try{return String(activeProjectId||'legacy')}catch{return'legacy'}}
function ext(type,name=''){const t=String(type||'').toLowerCase();if(t.includes('pdf'))return'pdf';if(t.includes('png'))return'png';if(t.includes('webp'))return'webp';if(t.includes('gif'))return'gif';if(t.includes('jpeg')||t.includes('jpg'))return'jpg';const m=String(name).match(/\.([a-z0-9]+)$/i);return m?m[1].toLowerCase():'bin'}
function uniqueSourceGroups(){const rows=metas().filter(m=>String(m.projectId)===projectId());const groups=new Map();for(const m of rows){const key=String(m.groupId||m.id);if(!groups.has(key))groups.set(key,{key,representative:m,pages:[]});groups.get(key).pages.push(m)}return [...groups.values()]}
async function drawingSettings(){if(typeof openDB!=='function')return[];const groups=uniqueSourceGroups();if(!groups.length)return[];const db=await openDB(),out=[];for(const g of groups){const tx=db.transaction('settings','readonly'),item=await dbReq(tx.objectStore('settings').get(String(g.representative.id)));await txDone(tx);if(item?.blob)out.push({...item,_metaGroup:g.pages,_groupKey:g.key})}return out}
function simpleHash(rows){return rows.map(x=>`${x._groupKey||x.id}|${x.name||''}|${x.date||''}|${x.blob?.size||0}|${x.blob?.type||''}|${x._metaGroup?.length||1}`).sort().join('~')}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
async function uploadAllBackgroundDrawings(force=false){
 if(!navigator.onLine)return 0;const pid=projectCloudId();if(!pid)return 0;const rows=await drawingSettings();if(!rows.length)return 0;
 const hash=simpleHash(rows);if(!force&&hash===lastHostedHash)return 0;const c=await client();const ses=(await c.auth.getSession()).data.session;if(!ses)return 0;
 let done=0;
 for(const d of rows){const group=d._metaGroup||[metaFor(d.id)].filter(Boolean),first=group[0]||{},suffix=ext(d.type||d.blob.type,d.name),safeGroup=encodeURIComponent(String(d._groupKey||d.id)),path=`${pid}/drawings/source-${safeGroup}.${suffix}`;
  const up=await c.storage.from('fieldverify').upload(path,d.blob,{upsert:true,contentType:d.type||d.blob.type||'application/octet-stream'});if(up.error)throw up.error;
  const existing=await c.from('fieldverify_project_assets').select('id').eq('project_id',pid).eq('asset_type','drawing').eq('storage_path',path).maybeSingle();if(existing.error)throw existing.error;
  const row={project_id:pid,asset_type:'drawing',storage_path:path,file_name:d.name||first.name||first.description||'Background drawing',metadata:{drawing_id:String(first.id||d.id),drawing_ids:group.map(m=>String(m.id)),group_id:first.groupId||null,category:first.category||'Custom',description:first.baseDescription||first.description||d.name||'Background drawing',pages:group.map(m=>({id:String(m.id),pageNumber:m.pageNumber||1,pageCount:m.pageCount||1,description:m.description||''})),mime_type:d.type||d.blob.type||'',background_drawing:true}};
  const q=existing.data?await c.from('fieldverify_project_assets').update(row).eq('id',existing.data.id):await c.from('fieldverify_project_assets').insert(row);if(q.error)throw q.error;done++;
 }
 lastHostedHash=hash;return done;
}

if(typeof buildProjectBackup==='function'){
 const originalBuild=buildProjectBackup;
 buildProjectBackup=async function buildWithBackgroundDrawings(){
  const built=await originalBuild();const payload=built?.payload||built;if(!payload||typeof payload!=='object')return built;
  const rows=await drawingSettings(),out=[];
  for(const d of rows){try{out.push({id:String(d.id),name:d.name||'Background drawing',type:d.type||d.blob.type||'application/octet-stream',date:d.date||new Date().toISOString(),sourceGroup:d._groupKey||String(d.id),pageMetas:d._metaGroup||[metaFor(d.id)].filter(Boolean),data:await blobToData(d.blob)})}catch(e){console.warn('Could not embed drawing source',d.id,e)}}
  payload.backgroundDrawings=out;payload.backgroundDrawingCount=out.reduce((n,x)=>n+(x.pageMetas?.length||1),0);payload.backgroundDrawingSourceCount=out.length;payload.includesBackgroundDrawings=true;
  return built?.payload?{...built,payload}:payload;
 };
}

const restoreInput=document.getElementById('restoreInput');
if(restoreInput&&restoreInput.onchange){
 const oldRestore=restoreInput.onchange;
 restoreInput.onchange=async function restoreWithBackgroundDrawings(e){
  const files=[...(e.target.files||[])];
  try{
   for(const f of files){if(!String(f.name||'').toLowerCase().endsWith('.json'))continue;let j;try{j=JSON.parse(await f.text())}catch{continue}const rows=Array.isArray(j?.backgroundDrawings)?j.backgroundDrawings:[];if(!rows.length)continue;
    const db=await openDB(),tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings'),existing=metas();let added=[];
    for(const d of rows){if(!d?.data)continue;const blob=dataToBlob(d.data),pageMetas=Array.isArray(d.pageMetas)&&d.pageMetas.length?d.pageMetas:[d.meta].filter(Boolean);if(pageMetas.length){for(const m of pageMetas){store.put({id:String(m.id),name:d.name||m.name||'Restored background drawing',type:d.type||'',date:d.date||new Date().toISOString(),pageNumber:m.pageNumber||1,pageCount:m.pageCount||1,blob});added.push(m)}}else if(d.id){store.put({id:String(d.id),name:d.name||'Restored background drawing',type:d.type||'',date:d.date||new Date().toISOString(),pageNumber:d.pageNumber||1,pageCount:d.pageCount||1,blob})}}
    await txDone(tx);if(added.length)localStorage.setItem(DRAWING_META_KEY,JSON.stringify([...existing.filter(x=>!added.some(m=>String(m.id)===String(x.id))),...added]));
   }
  }catch(err){console.warn('Background drawing restore prep failed',err)}
  const result=await oldRestore.call(this,e);try{await applyStoredDrawing?.()}catch{};return result;
 };
}

function hookHosted(){const h=window.FIELDVERIFY_HOSTED_BACKUP;if(!h||h.__backgroundHooked)return;h.__backgroundHooked=true;const oldBackup=h.backup;h.backup=async(...a)=>{try{await uploadAllBackgroundDrawings(true)}catch(e){console.warn('Background drawing host backup',e)}return oldBackup(...a)}}
// IMPORTANT: do not scan/upload all drawing blobs on startup, on every photo save,
// or on a timer. Large multi-page PDFs can exhaust Safari/iPad memory. Background
// drawings are synchronized by the drawing/hosted-backup flows and by explicit backup.
setTimeout(hookHosted,1200);addEventListener('online',hookHosted);
window.FIELDVERIFY_BACKGROUND_DRAWING_BACKUP={version:VERSION,sync:()=>uploadAllBackgroundDrawings(true)};
console.info(`FieldVerify background drawing backup ${VERSION} loaded`);
})();