/* FieldVerify Pro v10.24 - hosted project metadata + header selector */
(()=>{
'use strict';
const VERSION='10.24-project-header-1';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
let sb=null,session=null,syncing=false,syncTimer=null,formattingDrawing=false;
const coreSaveProjects=typeof saveProjects==='function'?saveProjects:null;
const coreCreateProject=typeof createProject==='function'?createProject:null;
const coreSwitchProject=typeof switchProject==='function'?switchProject:null;
function say(s){try{toast(s)}catch{}}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});session=(await sb.auth.getSession()).data.session;sb.auth.onAuthStateChange((_e,s)=>{session=s;if(s)queueHostedSync(250)});return sb}
function projectRow(p){return{name:p?.name||'FieldVerify Project',project_number:p?.number||'',client:p?.client||'',address:p?.address||'',drawing_revision:p?.drawingRevision||''}}
function refreshHeaderProjectSelector(){
 const old=document.getElementById('projectHeaderSelect');
 let s=old;
 if(!s){
   const anchor=document.getElementById('projectStatus');if(!anchor)return;
   anchor.style.display='none';
   s=document.createElement('select');s.id='projectHeaderSelect';s.className='badge';s.setAttribute('aria-label','Current project');s.style.cssText='color:#fff;max-width:245px;font-weight:900;background:#ffffff22';
   anchor.insertAdjacentElement('afterend',s);
   s.addEventListener('change',async()=>{const id=s.value;if(!id||id===String(activeProjectId))return;try{if(coreSwitchProject)await coreSwitchProject(id);else if(typeof switchProject==='function')await switchProject(id);refreshHeaderProjectSelector();formatDrawingSelector()}catch(e){say(`Project switch failed: ${e.message}`)}});
 }
 const list=Array.isArray(projects)?projects:[];
 const current=String(activeProjectId||'');
 s.innerHTML=list.map(p=>`<option value="${esc(p.id)}" ${String(p.id)===current?'selected':''}>${esc(p.name||'Unnamed Project')}</option>`).join('')||'<option>No project</option>';
 s.title=(typeof activeProject==='function'&&activeProject())?.name||'Current project';
}
function formatDrawingSelector(){
 if(formattingDrawing)return;const s=document.getElementById('drawingFilter'),category=document.getElementById('itemFilter')?.value;if(!s)return;
 formattingDrawing=true;
 try{
   const p=typeof activeProject==='function'?activeProject():null,rev=String(p?.drawingRevision||'').trim();
   const all=window.FIELDVERIFY_DRAWING_MANAGER?.library?.()||[];
   [...s.options].forEach(o=>{
     if(o.value){const m=all.find(x=>String(x.id)===String(o.value));const name=m?.description||m?.name||o.textContent||'Drawing';o.textContent=[rev&&`Rev. ${rev}`,name].filter(Boolean).join(' · ');o.title=m?.name||name;}
     else if(category){o.textContent=[rev&&`Rev. ${rev}`,`No ${category} drawing loaded`].filter(Boolean).join(' · ');}
     else{o.textContent=[rev&&`Rev. ${rev}`,'Project drawing'].filter(Boolean).join(' · ');}
   });
 }finally{formattingDrawing=false}
}
async function syncOneProject(p,notify=false){
 if(!p||p.id==='legacy'&&!p.needsHostedSync)return false;
 await client();session=(await sb.auth.getSession()).data.session;if(!session||!navigator.onLine)return false;
 const row=projectRow(p);
 if(p.cloudId){const q=await sb.from('fieldverify_projects').update(row).eq('id',p.cloudId).select('id').maybeSingle();if(q.error)throw q.error;p.needsHostedSync=false;return true;}
 if(!p.needsHostedSync)return false;
 const q=await sb.from('fieldverify_projects').insert(row).select().single();if(q.error)throw q.error;
 p.cloudId=q.data.id;p.needsHostedSync=false;p.hostedAt=new Date().toISOString();
 if(coreSaveProjects)coreSaveProjects();
 if(notify)say(`Project saved to hosting: ${p.name}`);
 return true;
}
async function syncPendingProjects(notify=false){
 if(syncing)return;syncing=true;
 try{for(const p of (projects||[])){if(p?.needsHostedSync||p?.cloudId)await syncOneProject(p,notify&&p?.needsHostedSync)}}catch(e){console.warn('Project metadata hosting sync',e)}finally{syncing=false;refreshHeaderProjectSelector();formatDrawingSelector()}
}
function queueHostedSync(delay=700){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncPendingProjects(false),delay)}
if(coreSaveProjects){saveProjects=function(){coreSaveProjects();refreshHeaderProjectSelector();formatDrawingSelector();queueHostedSync()}}
if(coreCreateProject){createProject=async function(){const before=new Set((projects||[]).map(p=>String(p.id)));await coreCreateProject();const p=typeof activeProject==='function'?activeProject():null;if(p&&!before.has(String(p.id))){p.needsHostedSync=true;if(coreSaveProjects)coreSaveProjects();refreshHeaderProjectSelector();formatDrawingSelector();try{await syncOneProject(p,true)}catch(e){say(`Project saved on this device; hosting sync pending: ${e.message}`)}}}}
function bindCreateButton(){const b=document.getElementById('createProjectBtn');if(b&&typeof createProject==='function'&&b.onclick!==createProject)b.onclick=createProject}
const obs=new MutationObserver(()=>{bindCreateButton();refreshHeaderProjectSelector();formatDrawingSelector()});obs.observe(document.documentElement,{childList:true,subtree:true});
document.getElementById('itemFilter')?.addEventListener('change',()=>setTimeout(formatDrawingSelector,20));
document.addEventListener('change',e=>{if(e.target?.id==='drawingFilter')setTimeout(formatDrawingSelector,20)});
addEventListener('online',()=>queueHostedSync(100));
setInterval(()=>{refreshHeaderProjectSelector();formatDrawingSelector()},1500);
setTimeout(async()=>{bindCreateButton();refreshHeaderProjectSelector();formatDrawingSelector();try{await client();queueHostedSync(250)}catch(e){console.warn('Project hosting client',e)}},100);
window.FIELDVERIFY_PROJECT_HEADER={version:VERSION,refresh:refreshHeaderProjectSelector,sync:syncPendingProjects,formatDrawing:formatDrawingSelector};
console.info(`FieldVerify project header ${VERSION} loaded`);
})();
