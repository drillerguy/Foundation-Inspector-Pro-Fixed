import{projectDirectory,loadRecordIndex,loadRecord,saveRecord,getPhoto,saveAppPrefs}from'./storage.js';
import{DrawingManager}from'./drawings.js';
import{itemTitle,statusText,pinVisual,progressStages,progressViewOptions,stageDone,setProgressStage,progressPalette}from'./status.js';

const $=id=>document.getElementById(id);
const projectSelect=$('projectSelect'),itemType=$('itemType'),progressView=$('progressView'),drawingSelect=$('drawingSelect'),pagesBtn=$('pagesBtn'),loadDrawingBtn=$('loadDrawingBtn'),drawingInput=$('drawingInput'),itemSelect=$('itemSelect'),itemSearch=$('itemSearch'),openItemBtn=$('openItemBtn'),panel=$('panel'),pins=$('pins'),planImage=$('planImage'),saveState=$('saveState'),toastEl=$('toast'),progressLegend=$('progressLegend');
let activeProjectId='',activeType='',recordIndex=[],activeItemKey='',activeRecord=null,photoUrls=[];

function toast(text){toastEl.textContent=text;toastEl.classList.remove('hidden');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.add('hidden'),2600)}
function saveLabel(text='Saved'){saveState.textContent=text;clearTimeout(saveState._t);saveState._t=setTimeout(()=>saveState.textContent='Ready',1500)}
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
function resetSelect(sel,label){sel.innerHTML='';sel.appendChild(option('',label));sel.value=''}
function releasePhotoUrls(){for(const u of photoUrls)try{URL.revokeObjectURL(u)}catch{}photoUrls=[]}
function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}

const drawings=new DrawingManager({img:planImage,statusEl:$('drawingStatus'),onChange:()=>{}});

async function boot(){
  // Deliberately light startup: project names only. No inspection records, drawing files or photos.
  const projects=await projectDirectory();
  for(const p of projects)projectSelect.appendChild(option(String(p.id),p.name||`Project ${p.id}`));
  saveState.textContent='Ready';
}

function clearUserContent(){
  activeType='';activeItemKey='';activeRecord=null;recordIndex=[];releasePhotoUrls();pins.innerHTML='';progressLegend.innerHTML='';panel.innerHTML='<div class="card"><h2>Choose a work type</h2><p>No inspection or drawing data has been loaded.</p></div>';
  itemType.value='';itemType.disabled=!activeProjectId;
  progressView.innerHTML='<option value="overall">Overall Progress</option>';progressView.value='overall';progressView.disabled=true;
  resetSelect(drawingSelect,'Choose drawing/page…');drawingSelect.disabled=true;pagesBtn.disabled=true;loadDrawingBtn.disabled=true;
  resetSelect(itemSelect,'Choose inspection item…');itemSelect.disabled=true;itemSearch.value='';itemSearch.disabled=true;openItemBtn.disabled=true;
  drawings.setContext(activeProjectId,'');
}

projectSelect.addEventListener('change',()=>{
  activeProjectId=projectSelect.value;
  saveAppPrefs({lastProjectId:activeProjectId});
  clearUserContent();
  if(activeProjectId){itemType.disabled=false;panel.innerHTML='<div class="card"><h2>Project selected</h2><p>Now choose Caisson, ERS, Tieback, Waler, or another work type. Nothing heavy has loaded yet.</p></div>'}
});

function configureProgressView(){
  const opts=progressViewOptions(activeType);progressView.innerHTML='';for(const x of opts)progressView.appendChild(option(x.id,x.label));
  progressView.value='overall';progressView.disabled=progressStages(activeType).length===0;renderProgressLegend();
}
function renderProgressLegend(){
  progressLegend.innerHTML='';const stages=progressStages(activeType);if(!stages.length)return;
  const add=(label,color)=>{const chip=document.createElement('span');chip.className='legend-chip';chip.innerHTML=`<span class="legend-dot" style="background:${color}"></span>${esc(label)}`;progressLegend.appendChild(chip)};
  add('Not Started',progressPalette.gray);for(const s of stages)add(s.label,s.color);add('NCR Open',progressPalette.red);
}

itemType.addEventListener('change',async()=>{
  activeType=itemType.value;activeItemKey='';activeRecord=null;releasePhotoUrls();pins.innerHTML='';
  resetSelect(drawingSelect,'Choose drawing/page…');resetSelect(itemSelect,'Choose inspection item…');
  drawingSelect.disabled=true;pagesBtn.disabled=true;itemSelect.disabled=true;itemSearch.disabled=true;openItemBtn.disabled=true;loadDrawingBtn.disabled=!activeType;
  configureProgressView();
  if(!activeProjectId||!activeType){drawings.setContext(activeProjectId,activeType);return}
  saveLabel('Loading lists…');
  drawings.setContext(activeProjectId,activeType);
  // Explicit type selection permits metadata/index reads, but no blobs or full inspections.
  const [drawingRows,index]=await Promise.all([drawings.loadMetadata(),loadRecordIndex(activeProjectId,activeType)]);
  recordIndex=index;
  for(const row of drawingRows)drawingSelect.appendChild(option(row.id,drawings.label(row)));
  drawingSelect.disabled=!drawingRows.length;pagesBtn.disabled=!drawingRows.length;
  populateItems();renderPinsFromIndex();
  const layers=progressStages(activeType);
  panel.innerHTML=`<div class="card"><h2>${esc(activeType)}</h2><p>${recordIndex.length} saved inspection item${recordIndex.length===1?'':'s'} indexed. Select an item to load its inspection. Select a drawing/page to load that drawing file.</p>${layers.length?`<p><b>${layers.length} progress layers:</b> ${layers.map(x=>esc(x.label)).join(' · ')}</p>`:''}</div>`;
  saveLabel('Lists ready');
});

progressView.addEventListener('change',()=>{saveAppPrefs({[`progressView:${activeType}`]:progressView.value});renderPinsFromIndex()});

function populateItems(){
  resetSelect(itemSelect,'Choose inspection item…');
  const map=new Map(recordIndex.map(x=>[String(x.itemKey),x]));
  if(activeType==='Caisson')for(const h of window.FOUNDATION_CAISSON_DATA?.HOTSPOTS||[]){const k=String(h.caisson);if(!map.has(k))map.set(k,{itemKey:k,label:k,status:'No information',started:false,complete:false,photoCount:0,progress:{}})}
  const rows=[...map.values()].sort((a,b)=>String(a.label||a.itemKey).localeCompare(String(b.label||b.itemKey),undefined,{numeric:true,sensitivity:'base'}));
  for(const x of rows)itemSelect.appendChild(option(String(x.itemKey),String(x.label||x.itemKey)));
  itemSelect.disabled=!rows.length;itemSearch.disabled=false;openItemBtn.disabled=false;
}

function renderPinsFromIndex(){
  pins.innerHTML='';if(activeType!=='Caisson')return;
  const byKey=new Map(recordIndex.map(x=>[String(x.itemKey),x]));
  for(const h of window.FOUNDATION_CAISSON_DATA?.HOTSPOTS||[]){
    const key=String(h.caisson),summary=byKey.get(key)||{itemKey:key,label:key,status:'No information',started:false,complete:false,progress:{},itemType:'Caisson'},b=document.createElement('button');b.type='button';b.className='pin';
    const visual=pinVisual({...summary,itemType:activeType},activeType,progressView.value||'overall');b.style.setProperty('--pin-color',visual.color);
    if(summary.complete)b.classList.add('done');if(String(summary.ncrState||'').toLowerCase()==='open')b.classList.add('ncr-open');
    b.style.left=`${h.x}%`;b.style.top=`${h.y}%`;b.textContent=key;b.title=`Caisson ${key} · ${visual.label}`;b.onclick=()=>openInspection(key);pins.appendChild(b)
  }
}

async function openInspection(key){
  if(!activeProjectId||!activeType||!key)return;
  activeItemKey=String(key);releasePhotoUrls();saveLabel('Loading inspection…');
  const r=await loadRecord(activeProjectId,activeItemKey);r.itemType=activeType;activeRecord=r;
  itemSelect.value=activeItemKey;itemSearch.value=String(r.itemLabel||activeItemKey);
  showInspection();saveLabel('Inspection loaded')
}
itemSelect.addEventListener('change',()=>{if(itemSelect.value)openInspection(itemSelect.value)});
openItemBtn.addEventListener('click',()=>{const raw=itemSearch.value.trim();if(!raw)return;const hit=recordIndex.find(x=>String(x.label||'').toLowerCase()===raw.toLowerCase()||String(x.itemKey)===raw);openInspection(hit?.itemKey||raw)});
itemSearch.addEventListener('keydown',e=>{if(e.key==='Enter')openItemBtn.click()});

function progressMarkup(r){
  const stages=progressStages(activeType);if(!stages.length)return'';
  return `<div class="progress-card"><h3>Progress Layers</h3><p>Each layer has its own drawing color. Tap a layer when that work is complete. Tap it again to undo.</p><div class="progress-grid">${stages.map(s=>{const done=stageDone(r,s.id);return `<button type="button" class="progress-btn ${done?'done':''}" data-progress-stage="${esc(s.id)}" style="${done?`background:${s.color}`:''}"><span class="stage-dot" style="background:${s.color}"></span><span>${esc(s.label)}<small>${done?'DONE':'NOT DONE'}</small></span></button>`}).join('')}</div></div>`
}

function showInspection(){
  const r=activeRecord;if(!r)return;
  const photos=Array.isArray(r.photos)?r.photos:[];
  panel.innerHTML=`<div class="card"><h2>${esc(itemTitle(activeItemKey,r))}</h2><div class="kv"><b>Status</b><span>${esc(statusText(r))}</span><b>Saved status</b><span>${esc(r.status||'No information')}</span><b>Photos</b><span>${photos.length} linked</span></div>${progressMarkup(r)}<label style="display:block;font-weight:900;margin-top:12px">Notes</label><textarea id="notesField" class="field" rows="5">${esc(r.notes||'')}</textarea><div class="actions"><button id="startWorkBtn" class="good">Start Work</button><button id="completeBtn">Complete</button><button id="saveNotesBtn" class="light">Save Notes</button><button id="loadPhotosBtn" class="light">Load Photos (${photos.length})</button></div><div id="photoArea"></div></div>`;
  $('saveNotesBtn').onclick=async()=>{r.notes=$('notesField').value;r.updated=new Date().toISOString();await persistRecord();toast('Notes saved')};
  $('startWorkBtn').onclick=async()=>{if(!r.workStartedAt)r.workStartedAt=new Date().toISOString();r.status='In Progress';r.updated=new Date().toISOString();await persistRecord();showInspection();renderPinsFromIndex();toast('Work started')};
  $('completeBtn').onclick=async()=>{r.workCompletedAt=new Date().toISOString();r.status='Complete';r.updated=new Date().toISOString();await persistRecord();showInspection();renderPinsFromIndex();toast('Marked complete')};
  $('loadPhotosBtn').onclick=loadPhotos;
  panel.querySelectorAll('[data-progress-stage]').forEach(b=>b.onclick=async()=>{const id=b.dataset.progressStage,done=stageDone(r,id);setProgressStage(r,id,!done);if(!r.workStartedAt)r.workStartedAt=new Date().toISOString();r.updated=new Date().toISOString();await persistRecord();showInspection();renderPinsFromIndex();toast(`${b.textContent.trim().replace(/DONE|NOT DONE/g,'').trim()} ${done?'cleared':'complete'}`)});
}

async function persistRecord(){
  await saveRecord(activeProjectId,activeItemKey,activeRecord);
  const i=recordIndex.findIndex(x=>String(x.itemKey)===activeItemKey);
  const summary={itemKey:activeItemKey,label:String(activeRecord.itemLabel||activeItemKey),status:activeRecord.status||'No information',started:Boolean(activeRecord.workStartedAt||activeRecord.pickupTime||activeRecord.unloadTime||(activeRecord.photos||[]).length),complete:Boolean(activeRecord.workCompletedAt||activeRecord.unloadTime||activeRecord.status==='Complete'||activeRecord.status==='Completed'),photoCount:(activeRecord.photos||[]).length,progress:{...(activeRecord.progress||{})},ncrState:activeRecord.ncrState||activeRecord.inspection?.ncrState||'',lat:activeRecord.lat,lon:activeRecord.lon,category:activeType};
  if(i>=0)recordIndex[i]={...recordIndex[i],...summary};else recordIndex.push(summary);saveLabel('Saved')
}

async function loadPhotos(){
  const area=$('photoArea');if(!area||!activeRecord)return;releasePhotoUrls();const ids=Array.isArray(activeRecord.photos)?activeRecord.photos:[];
  if(!ids.length){area.innerHTML='<p style="margin-top:12px">No photos linked to this inspection.</p>';return}
  area.innerHTML='<p style="margin-top:12px">Loading selected inspection photos…</p>';
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px';
  for(const id of ids){
    try{const p=await getPhoto(id);if(!p?.blob)continue;const u=URL.createObjectURL(p.blob);photoUrls.push(u);const img=document.createElement('img');img.src=u;img.alt=p.name||'Inspection photo';img.style.cssText='width:100%;border-radius:10px;display:block';grid.appendChild(img)}catch(err){console.warn('Photo load',id,err)}
  }
  area.replaceChildren(grid);if(!grid.children.length)area.innerHTML='<p style="margin-top:12px">The linked photo files are not available on this device.</p>'
}

drawingSelect.addEventListener('change',async()=>{if(!drawingSelect.value)return;saveLabel('Loading drawing…');await drawings.openById(drawingSelect.value);saveLabel('Drawing loaded')});

pagesBtn.addEventListener('click',()=>{
  const rows=drawings.rows();if(!rows.length)return;
  const root=$('modalRoot');root.innerHTML='<div class="modal"><div class="modal-box"><div class="modal-head"><h2>'+esc(activeType)+' Pages</h2><button id="closePages">Close</button></div><div id="pageList" class="page-list"></div></div></div>';
  $('closePages').onclick=()=>root.innerHTML='';const list=$('pageList');
  for(const row of rows){const b=document.createElement('button');b.type='button';b.textContent=drawings.label(row);if(row.id===drawingSelect.value)b.classList.add('active');b.onclick=async()=>{drawingSelect.value=row.id;root.innerHTML='';await drawings.openById(row.id)};list.appendChild(b)}
});

loadDrawingBtn.addEventListener('click',()=>drawingInput.click());
drawingInput.addEventListener('change',async()=>{
  const file=drawingInput.files?.[0];drawingInput.value='';if(!file)return;
  try{saveLabel('Saving drawing…');const rows=await drawings.addFile(file,activeType,'');resetSelect(drawingSelect,'Choose drawing/page…');for(const row of drawings.rows())drawingSelect.appendChild(option(row.id,drawings.label(row)));drawingSelect.disabled=false;pagesBtn.disabled=false;saveLabel('Drawing saved');toast(`${rows.length} drawing page${rows.length===1?'':'s'} saved. Choose one from the drawing dropdown to load it.`)}catch(err){console.error(err);toast(`Drawing save failed: ${err.message||err}`);saveLabel('Ready')}
});

window.addEventListener('beforeunload',releasePhotoUrls);
boot().catch(err=>{console.error(err);saveState.textContent='Startup error';toast(err.message||String(err))});
