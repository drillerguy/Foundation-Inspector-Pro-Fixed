/* FieldVerify Pro v10.24 - project/category drawing manager
   Organizes uploaded drawings by project and work type, supports multiple
   described drawings per category, and automatically switches drawings when
   the top item-type filter changes.
*/
(()=>{
'use strict';
const VERSION='10.24-drawings-1';
const CATEGORIES=['Caisson','ERS','Tieback','Footing','Column','Custom'];
const META_KEY='fieldVerifyDrawingLibraryV1024';
const ACTIVE_KEY='fieldVerifyActiveDrawingV1024';
const input=document.getElementById('drawingInput');
const filter=document.getElementById('itemFilter');
if(!input||!filter||typeof drawingStorageId!=='function'||typeof applyStoredDrawing!=='function'){
  console.warn('Drawing manager: core drawing controls unavailable');return;
}
const coreStorageId=drawingStorageId;
const coreApplyStoredDrawing=applyStoredDrawing;
const coreDrawingChange=input.onchange;
let activeStorageOverride=null;
let switching=false;

function projectId(){return String(typeof activeProjectId!=='undefined'&&activeProjectId||'legacy')}
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}}
function allMeta(){const x=readJson(META_KEY,[]);return Array.isArray(x)?x:[]}
function saveMeta(x){localStorage.setItem(META_KEY,JSON.stringify(x))}
function activeMap(){const x=readJson(ACTIVE_KEY,{});return x&&typeof x==='object'?x:{}}
function setActive(category,id){const a=activeMap();a[`${projectId()}|${category}`]=id;localStorage.setItem(ACTIVE_KEY,JSON.stringify(a))}
function getActive(category){return activeMap()[`${projectId()}|${category}`]||''}
function library(category){return allMeta().filter(x=>x.projectId===projectId()&&x.category===category).sort((a,b)=>String(a.description).localeCompare(String(b.description)))}
function uid(category){return `fieldverify-drawing:${projectId()}:${category.toLowerCase()}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`}
function cleanName(name){return String(name||'Drawing').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Drawing'}

// The existing drawing importer and renderer keep doing the heavy lifting.
// We only change which IndexedDB settings key they read/write.
drawingStorageId=function categorizedDrawingStorageId(){return activeStorageOverride||coreStorageId()};

function ensureUi(){
  if(document.getElementById('drawingFilter'))return;
  const s=document.createElement('select');s.id='drawingFilter';s.className='badge';s.setAttribute('aria-label','Drawing sheet');s.style.cssText='color:#fff;max-width:190px';
  filter.insertAdjacentElement('afterend',s);
  const style=document.createElement('style');style.textContent='#drawingFilter option{color:#111}.fv-drawing-modal{position:fixed;inset:0;z-index:900;background:#000a;display:grid;place-items:center;padding:18px}.fv-drawing-box{width:min(520px,100%);background:#fff;color:#16202a;border-radius:18px;padding:18px;box-shadow:0 12px 40px #0008}.fv-drawing-box h2{margin:0 0 8px}.fv-drawing-box label{display:block;font-size:12px;font-weight:900;margin-top:12px}.fv-drawing-box select,.fv-drawing-box input{width:100%;padding:12px;border:1px solid #c8d0d9;border-radius:10px;margin-top:5px}.fv-drawing-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.fv-drawing-actions button{padding:13px}.fv-drawing-save{background:#16803d;color:#fff}.fv-drawing-cancel{background:#e7edf4;color:#16202a}';document.head.appendChild(style);
  s.addEventListener('change',async()=>{if(!s.value)return;setActive(filter.value,s.value);await switchForCategory(filter.value,s.value)});
}

function refreshDrawingSelector(category){
  ensureUi();const s=document.getElementById('drawingFilter');
  if(!category||!CATEGORIES.includes(category)){s.innerHTML='<option value="">Project drawing</option>';s.disabled=true;return}
  const rows=library(category),current=getActive(category);
  s.disabled=!rows.length;
  s.innerHTML=rows.length?rows.map(x=>`<option value="${String(x.id).replace(/"/g,'&quot;')}" ${x.id===current?'selected':''}>${escapeHtml(x.description)}</option>`).join(''):`<option value="">No ${category} drawing loaded</option>`;
}
function escapeHtml(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}

function blankDrawing(category){
  const label=category?`No ${category} drawing loaded for this project`:'No drawing selected';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="100%" height="100%" fill="#eef2f6"/><text x="800" y="470" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#53606c">${label}</text><text x="800" y="530" text-anchor="middle" font-family="Arial" font-size="26" fill="#6d7883">Use Load / Replace Drawing to add one.</text></svg>`;
  const img=document.getElementById('planImage');if(img)img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

async function switchForCategory(category,requestedId=''){
  if(switching)return;switching=true;
  try{
    if(!CATEGORIES.includes(category)){activeStorageOverride=null;refreshDrawingSelector('');await coreApplyStoredDrawing();return}
    const rows=library(category);
    if(!rows.length){activeStorageOverride=null;refreshDrawingSelector(category);blankDrawing(category);return}
    let id=requestedId||getActive(category);if(!rows.some(x=>x.id===id))id=rows[0].id;
    setActive(category,id);activeStorageOverride=id;refreshDrawingSelector(category);await coreApplyStoredDrawing();
  }catch(err){console.warn('Drawing category switch failed',err);try{toast(`Drawing switch failed: ${err.message}`)}catch{}}
  finally{switching=false}
}

function chooseDrawingInfo(file){
  return new Promise(resolve=>{
    const old=document.getElementById('fvDrawingModal');if(old)old.remove();
    const modal=document.createElement('div');modal.id='fvDrawingModal';modal.className='fv-drawing-modal';
    modal.innerHTML=`<div class="fv-drawing-box"><h2>Save Drawing To Project</h2><div style="font-size:13px;color:#66717c">${escapeHtml(file?.name||'Selected drawing')}</div><label>DRAWING TYPE</label><select id="fvDrawingCategory">${CATEGORIES.map(c=>`<option ${filter.value===c?'selected':''}>${c}</option>`).join('')}</select><label>DRAWING DESCRIPTION</label><input id="fvDrawingDescription" value="${escapeHtml(cleanName(file?.name))}" placeholder="Example: East Tunnel or West Tunnel"><div style="font-size:12px;color:#687480;margin-top:6px">Use a description that identifies this sheet, such as East Tunnel, West Tunnel, North Wall, or Area A.</div><div class="fv-drawing-actions"><button id="fvDrawingCancel" class="fv-drawing-cancel">Cancel</button><button id="fvDrawingSave" class="fv-drawing-save">SAVE DRAWING</button></div></div>`;
    document.body.appendChild(modal);
    const finish=v=>{modal.remove();resolve(v)};
    modal.querySelector('#fvDrawingCancel').onclick=()=>finish(null);
    modal.querySelector('#fvDrawingSave').onclick=()=>{const category=modal.querySelector('#fvDrawingCategory').value,description=modal.querySelector('#fvDrawingDescription').value.trim();if(!description){try{toast('Add a drawing description first')}catch{};modal.querySelector('#fvDrawingDescription').focus();return}finish({category,description})};
  })
}

if(coreDrawingChange){
  input.onchange=async function categorizedDrawingUpload(e){
    const file=e.target.files?.[0];if(!file)return;
    const info=await chooseDrawingInfo(file);
    if(!info){e.target.value='';return}
    const id=uid(info.category),meta={id,projectId:projectId(),category:info.category,description:info.description,name:file.name||info.description,date:new Date().toISOString()};
    const rows=allMeta();rows.push(meta);saveMeta(rows);setActive(info.category,id);activeStorageOverride=id;
    filter.value=info.category;refreshDrawingSelector(info.category);
    try{
      await coreDrawingChange.call(input,e);
      try{renderPins();selected=null;nearest=null;showTarget()}catch{}
      try{toast(`${info.category} drawing saved: ${info.description}`)}catch{}
    }catch(err){
      saveMeta(allMeta().filter(x=>x.id!==id));try{toast(`Drawing import failed: ${err.message}`)}catch{}
    }
  };
}

// Core filter behavior still filters the project records/pins; this adds the
// corresponding drawing switch immediately afterward.
filter.addEventListener('change',()=>{const category=filter.value;setTimeout(()=>switchForCategory(category),0)});

// Re-run the drawing switch whenever the project selector changes the active
// project. A click on Projects itself does not switch; opening a project does.
document.addEventListener('click',e=>{
  const b=e.target.closest?.('.project-row button');if(!b)return;
  setTimeout(()=>{refreshDrawingSelector(filter.value);switchForCategory(filter.value)},100);
},true);

ensureUi();refreshDrawingSelector(filter.value);
if(CATEGORIES.includes(filter.value))setTimeout(()=>switchForCategory(filter.value),50);
window.FIELDVERIFY_DRAWING_MANAGER={version:VERSION,categories:CATEGORIES,library:()=>allMeta()};
console.info(`FieldVerify drawing manager ${VERSION} loaded`);
})();