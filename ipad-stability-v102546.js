(()=>{
'use strict';
const VERSION='10.25.49-drawing-switch-queue';
const ACTIVE_KEY='fieldVerifyActiveDrawingV1024';
let requestSeq=0;
let renderChain=Promise.resolve();

function projectId(){return String(typeof activeProjectId!=='undefined'?(activeProjectId||'legacy'):'legacy')}
function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function rememberActive(category,id){
  try{
    const raw=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'{}');
    const map=raw&&typeof raw==='object'?raw:{};
    map[`${projectId()}|${category}`]=id;
    localStorage.setItem(ACTIVE_KEY,JSON.stringify(map));
  }catch{}
}
function rememberedActive(category){
  try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'{}')?.[`${projectId()}|${category}`]||''}catch{return''}
}
function dbReq(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function settingById(id){
  if(!id||typeof openDB!=='function')return null;
  const db=await openDB(),tx=db.transaction('settings','readonly');
  const item=await dbReq(tx.objectStore('settings').get(id));
  await txDone(tx);return item||null;
}
function isPdf(item){return !!item&&(item.type==='application/pdf'||String(item.name||'').toLowerCase().endsWith('.pdf'))}

async function renderPdfBlob(item,seq){
  const pdf=await pdfInfo(item.blob);
  const pageNumber=Math.max(1,Math.min(pdf.numPages,item.pageNumber||1));
  const page=await pdf.getPage(pageNumber);
  const base=page.getViewport({scale:1});
  const mobile=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.maxTouchPoints>1;
  const maxDim=mobile?1600:2300;
  const scale=Math.min(2.1,maxDim/Math.max(base.width,base.height));
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
  const ctx=canvas.getContext('2d',{alpha:false});
  await page.render({canvasContext:ctx,viewport}).promise;
  if(seq!==requestSeq){canvas.width=1;canvas.height=1;try{page.cleanup()}catch{};return null}
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PDF page could not be rendered')),'image/jpeg',0.88));
  canvas.width=1;canvas.height=1;try{page.cleanup()}catch{}
  return {blob,pageNumber,pageCount:pdf.numPages};
}
async function loadStoredDrawingId(id,seq){
  if(seq!==requestSeq)return;
  const img=document.getElementById('planImage');if(!img)return;
  const item=await settingById(id);
  if(seq!==requestSeq)return;
  if(img._customUrl){try{URL.revokeObjectURL(img._customUrl)}catch{};img._customUrl=null}
  if(!item?.blob){
    img.src='caisson-plan.png';img.alt='Foundation caisson plan';img.dataset.fvDrawingId='';return;
  }
  if(isPdf(item)){
    const out=await renderPdfBlob(item,seq);if(!out||seq!==requestSeq)return;
    img._customUrl=URL.createObjectURL(out.blob);img.src=img._customUrl;
    img.alt=`${item.name||'PDF drawing'} — page ${out.pageNumber} of ${out.pageCount}`;
  }else{
    if(seq!==requestSeq)return;
    img._customUrl=URL.createObjectURL(item.blob);img.src=img._customUrl;img.alt=item.name||'Custom foundation drawing';
  }
  img.dataset.fvDrawingId=String(id);
  img.onload=()=>{try{if(typeof drawBlueDot==='function')drawBlueDot()}catch{};try{if(typeof targetNumber==='function'&&targetNumber()&&typeof scrollToSpot==='function')scrollToSpot(targetNumber())}catch{}};
}
function queueDrawingId(id){
  const seq=++requestSeq;
  renderChain=renderChain.catch(()=>{}).then(()=>loadStoredDrawingId(id,seq)).catch(err=>{console.warn('Queued drawing load failed',err);try{toast(`Drawing load failed: ${err.message||err}`)}catch{}});
  return renderChain;
}

// Install BEFORE drawing-manager loads. The manager captures this function, so every
// category/page load is serialized and stale PDF renders are discarded instead of
// fighting each other on iPad.
try{
  if(typeof applyStoredDrawing==='function'&&!applyStoredDrawing._fvQueued102549){
    applyStoredDrawing=async function queuedApplyStoredDrawing(){
      let id='';try{id=String(typeof drawingStorageId==='function'?drawingStorageId():'')}catch{}
      return queueDrawingId(id);
    };
    applyStoredDrawing._fvQueued102549=true;
  }
}catch(e){console.warn('Queued drawing loader could not install',e)}

function rowsFor(category){
  const mgr=window.FIELDVERIFY_DRAWING_MANAGER;
  if(!mgr||!category)return[];
  return (mgr.library?.()||[]).filter(x=>String(x.projectId)===projectId()&&x.category===category)
    .sort((a,b)=>(Number(a.pageNumber)||0)-(Number(b.pageNumber)||0));
}
function chooseRow(category){
  const rows=rowsFor(category);if(!rows.length)return null;
  const remembered=rememberedActive(category);
  return rows.find(x=>x.id===remembered)||rows[0];
}
function syncSelectorAndManager(row,attempt=0){
  if(!row)return;
  const drawing=document.getElementById('drawingFilter');
  if(!drawing){if(attempt<5)setTimeout(()=>syncSelectorAndManager(row,attempt+1),180);return}
  const option=[...drawing.options].some(o=>o.value===row.id);
  if(option){drawing.value=row.id;drawing.dispatchEvent(new Event('change',{bubbles:true}));return}
  if(attempt<5)setTimeout(()=>syncSelectorAndManager(row,attempt+1),220);
}
function activateCategory(category){
  if(!category)return;
  const row=chooseRow(category);
  if(!row){return}
  rememberActive(category,row.id);
  const drawing=document.getElementById('drawingFilter');if(drawing&&[...drawing.options].some(o=>o.value===row.id))drawing.value=row.id;
  // Load the correct category drawing ourselves even if the manager was busy with
  // the previous category. Then sync the manager's internal active id afterward.
  queueDrawingId(row.id);
  setTimeout(()=>syncSelectorAndManager(row,0),320);
}

function lightweightPages(){
  const filter=document.getElementById('itemFilter');
  const drawing=document.getElementById('drawingFilter');
  const category=filter?.value||'';
  const rows=rowsFor(category);
  if(!rows.length){try{toast(`No ${category||'project'} drawing pages loaded`)}catch{};return}
  document.getElementById('fvLitePagesModal')?.remove();
  const modal=document.createElement('div');modal.id='fvLitePagesModal';modal.className='fv-drawing-modal';
  modal.innerHTML=`<div class="fv-drawing-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h2 style="margin:0">${esc(category)} Pages</h2><div style="font-size:12px;color:#687480">Tap a page to open it.</div></div><button id="fvLiteClose" style="padding:10px;background:#e7edf4">Close</button></div><div id="fvLiteList" style="display:grid;gap:8px;margin-top:12px"></div></div>`;
  document.body.appendChild(modal);modal.querySelector('#fvLiteClose').onclick=()=>modal.remove();
  const list=modal.querySelector('#fvLiteList');
  for(const x of rows){
    const b=document.createElement('button');b.type='button';b.style.cssText='padding:14px;text-align:left;background:#eef3f8;color:#16202a;border:2px solid #d7dee7;border-radius:12px';
    const label=x.pageCount>1?`${x.baseDescription||x.description||'Drawing'} · Page ${x.pageNumber} of ${x.pageCount}`:(x.description||x.name||'Drawing');
    b.textContent=label;if(x.id===drawing?.value)b.style.borderColor='#16803d';
    b.onclick=()=>{b.disabled=true;b.textContent=`Loading ${label}…`;rememberActive(category,x.id);if(drawing&&[...drawing.options].some(o=>o.value===x.id))drawing.value=x.id;queueDrawingId(x.id);setTimeout(()=>syncSelectorAndManager(x,0),250);setTimeout(()=>modal.remove(),220)};
    list.appendChild(b);
  }
}
function replacePagesButton(){
  const old=document.getElementById('drawingPagesBtn');if(!old||old.dataset.fvStable==='1')return;
  const b=old.cloneNode(true);b.dataset.fvStable='1';b.onclick=e=>{e.preventDefault();e.stopPropagation();lightweightPages()};old.replaceWith(b);
}
function install(){replacePagesButton()}
install();setTimeout(install,450);setTimeout(install,1200);setTimeout(install,2200);
document.addEventListener('change',e=>{
  if(e.target?.id==='itemFilter'){
    const category=e.target.value;
    // Let drawing-manager refresh its selector first, then force the requested category drawing.
    setTimeout(()=>activateCategory(category),140);
    setTimeout(()=>activateCategory(category),700);
    setTimeout(install,50);
  }
},true);
window.FIELDVERIFY_IPAD_STABILITY={version:VERSION,pages:lightweightPages,activateCategory,loadDrawing:queueDrawingId};
console.info(`FieldVerify iPad drawing queue ${VERSION} loaded`);
})();
