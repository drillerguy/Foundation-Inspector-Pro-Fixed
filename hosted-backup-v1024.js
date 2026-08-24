/* FieldVerify Pro v10.24 - hosted project backup/restore
   Server is the source of truth. Manual Backup Project creates a hosted
   snapshot; Restore Project restores from hosted snapshots. Changes also
   create/update one automatic hosted snapshot in the background.
*/
(()=>{
'use strict';
const VERSION='10.24-hosted-backup-1';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const DRAWING_META_KEY='fieldVerifyDrawingLibraryV1024';
const DRAWING_ACTIVE_KEY='fieldVerifyActiveDrawingV1024';
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let sb=null,session=null,autoTimer=null,autoBusy=false,lastAutoHash='';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function say(s){try{toast(s)}catch{}}
function pid(){const p=typeof activeProject==='function'?activeProject():null;const x=p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):'');return x||''}
function projectName(){try{return activeProject()?.name||'FieldVerify Project'}catch{return'FieldVerify Project'}}
function readJson(k,f){try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});session=(await sb.auth.getSession()).data.session;sb.auth.onAuthStateChange((_e,s)=>session=s);return sb}
async function requireHosted(){await client();session=(await sb.auth.getSession()).data.session;if(!session)throw Error('Sign in to FieldVerify hosting first');const id=pid();if(!id)throw Error('Open a hosted FieldVerify project first');return id}
function snapshotObject(kind){
 const p=typeof activeProject==='function'?activeProject():null;
 return {format:'FieldVerify Hosted Snapshot',version:VERSION,kind,created:new Date().toISOString(),project:{id:pid(),name:p?.name||'',number:p?.number||'',address:p?.address||'',client:p?.client||'',drawingRevision:p?.drawingRevision||''},records:JSON.parse(JSON.stringify(typeof records==='object'&&records||{})),ncrRows:JSON.parse(JSON.stringify(Array.isArray(ncrRows)?ncrRows:[])),drawingLibrary:readJson(DRAWING_META_KEY,[]).filter(x=>String(x.projectId)===String(activeProjectId)||String(x.projectId)===pid()),activeDrawings:readJson(DRAWING_ACTIVE_KEY,{})};
}
function lightHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return String(h>>>0)}
function idbReq(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function allSettings(){try{const db=await openDB(),tx=db.transaction('settings','readonly');const v=await idbReq(tx.objectStore('settings').getAll());await txDone(tx);return v||[]}catch{return[]}}
function extForMime(type,name=''){const t=String(type||'').toLowerCase();if(t.includes('pdf'))return'pdf';if(t.includes('png'))return'png';if(t.includes('webp'))return'webp';if(t.includes('gif'))return'gif';if(t.includes('jpeg')||t.includes('jpg'))return'jpg';const m=String(name).match(/\.([a-z0-9]+)$/i);return m?m[1].toLowerCase():'bin'}
async function syncDrawingsToHost(id){
 const meta=readJson(DRAWING_META_KEY,[]).filter(x=>String(x.projectId)===String(activeProjectId)||String(x.projectId)===id);
 if(!meta.length)return 0;
 const settings=await allSettings(),byId=new Map(settings.map(x=>[String(x.id),x]));let done=0;
 for(const m of meta){const d=byId.get(String(m.id));if(!d?.blob)continue;const ext=extForMime(d.type||d.blob.type,d.name||m.name);const path=`${id}/drawings/${encodeURIComponent(String(m.id))}.${ext}`;
   const up=await sb.storage.from('fieldverify').upload(path,d.blob,{upsert:true,contentType:d.type||d.blob.type||'application/octet-stream'});if(up.error)throw up.error;
   const existing=await sb.from('fieldverify_project_assets').select('id').eq('project_id',id).eq('asset_type','drawing').eq('storage_path',path).maybeSingle();if(existing.error)throw existing.error;
   const row={project_id:id,asset_type:'drawing',storage_path:path,file_name:d.name||m.name||m.description||'Drawing',metadata:{drawing_id:String(m.id),category:m.category||'Custom',description:m.description||d.name||'Drawing',pageNumber:d.pageNumber||1,pageCount:d.pageCount||1,mime_type:d.type||d.blob.type||''}};
   const q=existing.data?await sb.from('fieldverify_project_assets').update(row).eq('id',existing.data.id):await sb.from('fieldverify_project_assets').insert(row);if(q.error)throw q.error;done++;
 }
 return done;
}
async function ensurePhotosHosted(id){
 if(typeof openDB!=='function')return 0;let rows=[];try{const db=await openDB(),tx=db.transaction('photos','readonly');rows=await idbReq(tx.objectStore('photos').getAll());await txDone(tx)}catch{return 0}
 const refs=new Set(Object.values(records||{}).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]).map(String));rows=rows.filter(p=>p?.id&&p?.blob&&refs.has(String(p.id)));if(!rows.length)return 0;
 const q=await sb.from('fieldverify_photos').select('id').eq('project_id',id);if(q.error)throw q.error;const remote=new Set((q.data||[]).map(x=>String(x.id)));let done=0;
 for(const p of rows){if(remote.has(String(p.id)))continue;const ext=extForMime(p.type||p.blob.type,p.name);const item=String(p.caisson??p.number??'unknown'),path=`${id}/${encodeURIComponent(item)}/${encodeURIComponent(String(p.id))}.${ext}`;const up=await sb.storage.from('fieldverify').upload(path,p.blob,{upsert:true,contentType:p.type||p.blob.type||'image/jpeg'});if(up.error)throw up.error;const meta=await sb.from('fieldverify_photos').upsert({id:String(p.id),project_id:id,item_key:item,storage_path:path,file_name:p.name||'',mime_type:p.type||p.blob.type||'',captured_at:p.date||null,lat:p.lat??null,lon:p.lon??null,metadata:{hostedBackup:true}},{onConflict:'id'});if(meta.error)throw meta.error;done++}
 return done;
}
async function saveSnapshot(kind='manual',quiet=false){
 const id=await requireHosted();if(!navigator.onLine)throw Error('Internet connection required for hosted backup');
 const snap=snapshotObject(kind);await ensurePhotosHosted(id);await syncDrawingsToHost(id);
 if(kind==='auto'){
   const raw=JSON.stringify(snap),hash=lightHash(raw);if(hash===lastAutoHash)return false;lastAutoHash=hash;
   const old=await sb.from('fieldverify_project_backups').select('id').eq('project_id',id).eq('backup_kind','auto').maybeSingle();if(old.error)throw old.error;
   const row={project_id:id,backup_kind:'auto',name:'Automatic backup',snapshot:snap,updated_at:new Date().toISOString()};const q=old.data?await sb.from('fieldverify_project_backups').update(row).eq('id',old.data.id):await sb.from('fieldverify_project_backups').insert(row);if(q.error)throw q.error;
 }else{
   const q=await sb.from('fieldverify_project_backups').insert({project_id:id,backup_kind:'manual',name:`${projectName()} - ${new Date().toLocaleString()}`,snapshot:snap});if(q.error)throw q.error;
 }
 if(!quiet)say(kind==='auto'?'Project autosaved to hosting':'Project backup saved to hosting');return true;
}
function queueAuto(){clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{if(autoBusy||!navigator.onLine)return;autoBusy=true;try{await saveSnapshot('auto',true)}catch(e){console.warn('Hosted autosave',e)}finally{autoBusy=false}},4000)}
async function hostedBackup(){try{say('Saving complete project to hosting…');await saveSnapshot('manual',false)}catch(e){say(`Hosted backup failed: ${e.message}`)}}
function modalShell(title,body){document.getElementById('fvHostedRestoreModal')?.remove();const d=document.createElement('div');d.id='fvHostedRestoreModal';d.style.cssText='position:fixed;inset:0;z-index:1100;background:#000a;padding:18px;overflow:auto';d.innerHTML=`<div style="max-width:560px;margin:5vh auto;background:#fff;color:#16202a;border-radius:18px;padding:18px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 style="margin:0">${esc(title)}</h2><button id="fvHostedClose" style="padding:10px">Close</button></div><div id="fvHostedBody" style="margin-top:12px">${body}</div></div>`;document.body.appendChild(d);d.querySelector('#fvHostedClose').onclick=()=>d.remove();return d}
async function restoreSnapshotRow(row){
 const id=await requireHosted(),snap=row.snapshot||{};if(!snap.records||typeof snap.records!=='object')throw Error('Backup has no project records');say('Restoring hosted project…');
 const del=await sb.from('fieldverify_records').delete().eq('project_id',id);if(del.error)throw del.error;
 const vals=Object.entries(snap.records).map(([k,r])=>({project_id:id,item_key:String(k),item_type:r.itemType||'Caisson',item_label:r.itemLabel||'',status:r.status||'No information',verified:!!r.verified,notes:r.notes||'',lat:r.lat??null,lon:r.lon??null,condition:r.condition||'',pickup_time:r.pickupTime||null,unload_time:r.unloadTime||null,pickup_gps:r.pickupGPS||null,unload_gps:r.unloadGPS||null,inspection:r.inspection||{},history:r.history||[],updated_at:r.updated||new Date().toISOString()}));
 for(let i=0;i<vals.length;i+=50){const q=await sb.from('fieldverify_records').upsert(vals.slice(i,i+50),{onConflict:'project_id,item_key'});if(q.error)throw q.error}
 const st=await sb.from('fieldverify_project_state').upsert({project_id:id,ncr_rows:Array.isArray(snap.ncrRows)?snap.ncrRows:[],settings:{restored_from_backup:row.id,restored_at:new Date().toISOString()},updated_at:new Date().toISOString()},{onConflict:'project_id'});if(st.error)throw st.error;
 if(Array.isArray(snap.drawingLibrary))localStorage.setItem(DRAWING_META_KEY,JSON.stringify([...readJson(DRAWING_META_KEY,[]).filter(x=>String(x.projectId)!==String(activeProjectId)&&String(x.projectId)!==id),...snap.drawingLibrary]));if(snap.activeDrawings)localStorage.setItem(DRAWING_ACTIVE_KEY,JSON.stringify(snap.activeDrawings));
 await restoreDrawingsFromHost(id);say('Hosted project restored. Reloading…');setTimeout(()=>location.reload(),700);
}
async function restoreDrawingsFromHost(id){
 if(typeof openDB!=='function')return;const q=await sb.from('fieldverify_project_assets').select('*').eq('project_id',id).eq('asset_type','drawing');if(q.error)throw q.error;if(!(q.data||[]).length)return;const db=await openDB(),tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings');
 for(const a of q.data||[]){const dl=await sb.storage.from('fieldverify').download(a.storage_path);if(dl.error||!dl.data)continue;const m=a.metadata||{},did=String(m.drawing_id||`hosted:${a.id}`);store.put({id:did,name:a.file_name||m.description||'Drawing',type:m.mime_type||dl.data.type,date:a.created_at,pageNumber:m.pageNumber||1,pageCount:m.pageCount||1,blob:dl.data})}
 await txDone(tx);
}
async function hostedRestore(){try{const id=await requireHosted();const q=await sb.from('fieldverify_project_backups').select('id,backup_kind,name,snapshot,created_at,updated_at').eq('project_id',id).order('created_at',{ascending:false}).limit(30);if(q.error)throw q.error;const rows=q.data||[];const d=modalShell('Restore Project From Hosting',rows.length?rows.map((r,i)=>`<button data-i="${i}" style="display:block;width:100%;text-align:left;padding:13px;margin:8px 0;border-radius:10px;background:${r.backup_kind==='auto'?'#eef3f8':'#083a73'};color:${r.backup_kind==='auto'?'#16202a':'#fff'}"><b>${esc(r.backup_kind==='auto'?'Automatic backup':r.name||'Manual backup')}</b><br><span style="font-size:12px">${esc(new Date(r.updated_at||r.created_at).toLocaleString())}</span></button>`).join(''):'<p>No hosted backups exist for this project yet.</p>');d.querySelectorAll('[data-i]').forEach(b=>b.onclick=async()=>{const r=rows[+b.dataset.i];if(!confirm(`Restore this hosted backup?\n\n${r.name||'Automatic backup'}\n${new Date(r.updated_at||r.created_at).toLocaleString()}\n\nThis will replace the current hosted project records with that backup.`))return;try{await restoreSnapshotRow(r)}catch(e){say(`Restore failed: ${e.message}`)}})}catch(e){say(`Hosted restore failed: ${e.message}`)}}
function rebindButtons(){const b=document.getElementById('backupBtn');if(b&&!b.dataset.hosted){b.dataset.hosted='1';b.textContent='BACKUP PROJECT TO HOSTING';b.onclick=hostedBackup}const r=document.getElementById('restoreBtn');if(r&&!r.dataset.hosted){r.dataset.hosted='1';r.textContent='RESTORE PROJECT FROM HOSTING';r.onclick=e=>{e.preventDefault();e.stopPropagation();hostedRestore()}}}
// Replace global actions so any newly rendered tool cards use hosting.
try{backupProject=hostedBackup}catch{}
// Keep local file restore input available only for legacy/emergency imports; the normal Restore button uses hosting.
const observer=new MutationObserver(rebindButtons);observer.observe(document.documentElement,{childList:true,subtree:true});setInterval(rebindButtons,1500);rebindButtons();
// Autosave after any application persistence event. Server remains authoritative;
// the browser's local data is only an operational cache needed by the current UI.
try{const p0=persist;persist=function(){p0();queueAuto()}}catch{}
try{const n0=persistNcr;persistNcr=function(){n0();queueAuto()}}catch{}
try{const s0=savePhotos;savePhotos=async function(n,f){const x=await s0(n,f);queueAuto();return x}}catch{}
addEventListener('online',queueAuto);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueAuto()});setTimeout(queueAuto,2500);
window.FIELDVERIFY_HOSTED_BACKUP={version:VERSION,backup:hostedBackup,restore:hostedRestore,autosave:()=>saveSnapshot('auto',true)};
console.info(`FieldVerify hosted backup ${VERSION} loaded`);
})();