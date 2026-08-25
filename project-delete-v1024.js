/* FieldVerify Pro v10.24 - delete project */
(()=>{
'use strict';
const VERSION='10.24-project-delete-2';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const DRAWING_META_KEY='fieldVerifyDrawingLibraryV1024';
const DRAWING_ACTIVE_KEY='fieldVerifyActiveDrawingV1024';
let sb=null,session=null,busy=false;
function say(s){try{toast(s)}catch{}}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});session=(await sb.auth.getSession()).data.session;return sb}
function readJson(k,f){try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}}
function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}
function localProject(id){return (projects||[]).find(p=>String(p.id)===String(id))}
async function deleteIndexedDrawings(projectId,cloudId){
 const meta=readJson(DRAWING_META_KEY,[]);const doomed=meta.filter(x=>String(x.projectId)===String(projectId)||cloudId&&String(x.projectId)===String(cloudId));
 if(doomed.length&&typeof openDB==='function')try{const db=await openDB(),tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings');doomed.forEach(x=>store.delete(String(x.id)));await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}catch(e){console.warn('Delete project drawings',e)}
 writeJson(DRAWING_META_KEY,meta.filter(x=>!doomed.some(d=>String(d.id)===String(x.id))));
 const amap=readJson(DRAWING_ACTIVE_KEY,{});for(const k of Object.keys(amap)){if(k.startsWith(`${projectId}|`)||(cloudId&&k.startsWith(`${cloudId}|`)))delete amap[k]}writeJson(DRAWING_ACTIVE_KEY,amap);
}
async function deleteLocalPhotos(projectId){if(typeof openDB!=='function')return;try{const db=await openDB(),tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos');const rows=await new Promise((res,rej)=>{const q=store.getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)});for(const p of rows){if(String(p.projectId||'')===String(projectId))store.delete(p.id)}await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}catch(e){console.warn('Delete local project photos',e)}}
async function cleanupHostedStorage(cloudId){if(!cloudId)return;try{await client();if(!session)return;const assets=await sb.from('fieldverify_project_assets').select('storage_path').eq('project_id',cloudId);const photos=await sb.from('fieldverify_photos').select('storage_path').eq('project_id',cloudId);const paths=[...(assets.data||[]),...(photos.data||[])].map(x=>x.storage_path).filter(Boolean);for(let i=0;i<paths.length;i+=100){const r=await sb.storage.from('fieldverify').remove(paths.slice(i,i+100));if(r.error)console.warn('Storage cleanup',r.error)}}catch(e){console.warn('Hosted storage cleanup',e)}}
async function deleteHostedProject(cloudId){if(!cloudId)return;await client();session=(await sb.auth.getSession()).data.session;if(!session)throw Error('Sign in to FieldVerify hosting before deleting this hosted project');if(!navigator.onLine)throw Error('Internet connection required to delete a hosted project');await cleanupHostedStorage(cloudId);const q=await sb.from('fieldverify_projects').delete().eq('id',cloudId);if(q.error)throw q.error}
function confirmDeletePopup(p,cloudId){
 return new Promise(resolve=>{
  document.getElementById('fvDeleteConfirmModal')?.remove();
  const details=[p.number&&`Project # ${p.number}`,p.client&&p.client].filter(Boolean).join(' · ');
  const d=document.createElement('div');d.id='fvDeleteConfirmModal';d.style.cssText='position:fixed;inset:0;z-index:1500;background:#000a;padding:18px;display:grid;place-items:center';
  d.innerHTML=`<div style="width:min(520px,100%);background:#fff;color:#16202a;border-radius:18px;padding:20px;box-shadow:0 12px 40px #0008"><h2 style="margin:0 0 10px;color:#b42318">Delete Current Project?</h2><div style="font-size:20px;font-weight:900;margin-bottom:4px">${esc(p.name||'Unnamed Project')}</div>${details?`<div style="font-size:13px;color:#687480;margin-bottom:14px">${esc(details)}</div>`:''}<div style="padding:12px;background:#fff1f0;border:1px solid #f0b5b0;border-radius:10px;font-size:13px;line-height:1.45">This will permanently delete the project records, NCR information, photos, drawings and backups from this device${cloudId?' and from FieldVerify hosting':''}. This cannot be undone.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px"><button id="fvDeleteCancel" type="button" style="padding:14px;background:#e7edf4;color:#16202a;border-radius:11px;font-weight:900">CANCEL</button><button id="fvDeleteConfirm" type="button" style="padding:14px;background:#b42318;color:#fff;border-radius:11px;font-weight:900">DELETE PROJECT</button></div></div>`;
  document.body.appendChild(d);
  const finish=v=>{d.remove();resolve(v)};
  d.querySelector('#fvDeleteCancel').onclick=()=>finish(false);
  d.querySelector('#fvDeleteConfirm').onclick=()=>finish(true);
  d.addEventListener('click',e=>{if(e.target===d)finish(false)});
 });
}
async function deleteProject(id){
 if(busy)return;const p=localProject(id);if(!p)return say('Project not found');
 const cloudId=p.cloudId||(/^[0-9a-f-]{36}$/i.test(String(p.id))?String(p.id):'');
 if(!(await confirmDeletePopup(p,cloudId)))return say('Project delete canceled');
 busy=true;try{
   if(cloudId)await deleteHostedProject(cloudId);
   await deleteIndexedDrawings(p.id,cloudId);await deleteLocalPhotos(p.id);
   localStorage.removeItem(`fieldVerifyProjectRecords:${p.id}`);localStorage.removeItem(`fieldVerifyProjectNcr:${p.id}`);
   const wasActive=String(activeProjectId)===String(p.id);projects=projects.filter(x=>String(x.id)!==String(p.id));
   if(!projects.length)projects=[{id:'legacy',name:'No Project',number:'',address:'',client:'',drawingRevision:'',created:new Date().toISOString()}];
   if(wasActive)activeProjectId=projects[0].id;
   if(typeof saveProjects==='function')saveProjects();
   if(wasActive){if(typeof loadRecords==='function')loadRecords();selected=null;nearest=null;const f=document.getElementById('itemFilter');if(f)f.value='';try{await applyStoredDrawing()}catch{};try{renderPins()}catch{};try{showProjectHome()}catch{}}
   window.FIELDVERIFY_PROJECT_HEADER?.refresh?.();say(`Project deleted: ${p.name}`);
 }catch(e){say(`Project was not deleted: ${e.message||e}`)}finally{busy=false;setTimeout(bindDeleteButtons,100)}
}
function bindDeleteButtons(){
 document.querySelectorAll('.project-row').forEach(row=>{const open=row.querySelector('.openProject');if(!open)return;let b=row.querySelector('.fvDeleteProject');if(!b){b=document.createElement('button');b.type='button';b.className='fvDeleteProject';b.textContent='Delete';b.style.cssText='padding:10px;background:#b42318;color:#fff;margin-left:4px';open.insertAdjacentElement('afterend',b)}b.dataset.id=open.dataset.id||'';b.onclick=e=>{e.preventDefault();e.stopPropagation();deleteProject(b.dataset.id)}});
 const home=document.querySelector('#panel .card');if(home&&!document.getElementById('fvDeleteCurrentProject')){const b=document.createElement('button');b.id='fvDeleteCurrentProject';b.type='button';b.textContent='DELETE CURRENT PROJECT';b.style.cssText='width:100%;margin-top:12px;padding:12px;background:#b42318;color:#fff;border-radius:10px;font-weight:900';b.onclick=()=>deleteProject(String(activeProjectId));home.appendChild(b)}
}
document.addEventListener('click',e=>{if(e.target?.closest?.('#projectsBtn,.openProject,#projectHeaderSelect'))setTimeout(bindDeleteButtons,100)},true);setInterval(bindDeleteButtons,2000);setTimeout(bindDeleteButtons,150);
window.FIELDVERIFY_PROJECT_DELETE={version:VERSION,deleteProject};
console.info(`FieldVerify project delete ${VERSION} loaded`);
})();
