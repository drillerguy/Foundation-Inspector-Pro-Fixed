(()=>{
'use strict';
const VERSION='10.25.9-ers-tieback-progress-1';
const KEY='fieldVerifyErsTiebackProgressV10259';
const filter=document.getElementById('itemFilter');
const pins=document.getElementById('pins');
const camera=document.getElementById('cameraInput');
if(!filter||!pins||!camera){console.warn('ERS/Tieback progress module: required controls missing');return;}
const STAGES={
  ERS:[
    {id:'predrill',label:'PRE-DRILLED',color:'#0a84ff'},
    {id:'initial',label:'INITIAL SET',color:'#ff9f0a'},
    {id:'final',label:'FINAL DRIVEN',color:'#16803d'}
  ],
  Tieback:[
    {id:'drilled',label:'DRILLED',color:'#0a84ff'},
    {id:'regrouted',label:'REGROUTED',color:'#7b3fc6'},
    {id:'waler',label:'WALER INSTALLED',color:'#ff9f0a'},
    {id:'tested',label:'TESTED',color:'#16803d'}
  ]
};
let pending=null;
function pid(){try{return String(typeof activeProjectId!=='undefined'&&activeProjectId||'legacy')}catch{return'legacy'}}
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function write(x){localStorage.setItem(KEY,JSON.stringify(x))}
function key(mode,n){return `${pid()}|${mode}|${n}`}
function currentMode(){return filter.value==='ERS'||filter.value==='Tieback'?filter.value:''}
function currentSelected(){try{return selected==null?null:Number(selected)}catch{return null}}
function getStatus(mode,n){return read()[key(mode,n)]||null}
function saveStatus(mode,n,stage){const all=read();all[key(mode,n)]={stage:stage.id,label:stage.label,color:stage.color,updated:new Date().toISOString()};write(all)}
function stageById(mode,id){return (STAGES[mode]||[]).find(s=>s.id===id)||null}
function applyPinColors(){const mode=currentMode();document.querySelectorAll('#pins .pin').forEach(p=>{
  p.style.removeProperty('--fv-progress-color');
  p.classList.remove('fv-progress-stage');
  if(!mode)return;
  const n=Number(p.dataset.n);if(!Number.isFinite(n))return;
  const st=getStatus(mode,n);if(!st)return;
  p.classList.add('fv-progress-stage');
  p.style.setProperty('--fv-progress-color',st.color||'#16803d');
  p.title=`${mode} ${n}: ${st.label||st.stage}`;
})}
function ensureStyle(){if(document.getElementById('fvProgressStyle'))return;const s=document.createElement('style');s.id='fvProgressStyle';s.textContent=`
#pins .pin.fv-progress-stage{background:var(--fv-progress-color)!important;color:#fff!important}
#fvProgressBar{position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:65;width:min(690px,calc(100% - 18px));background:#fff;border:2px solid #083a73;border-radius:16px;padding:9px;box-shadow:0 5px 22px #0006;display:none;line-height:normal}
#fvProgressBar.show{display:block}.fv-progress-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}.fv-progress-title{font-size:14px;font-weight:900;color:#15202b}.fv-progress-sub{font-size:11px;color:#66717c}.fv-progress-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.fv-progress-btn{min-height:44px;border-radius:10px;color:#fff;padding:7px 5px;font-size:11px;font-weight:900}.fv-progress-close{background:#e7edf4;color:#16202a;padding:7px 10px;border-radius:9px}@media(max-width:520px){.fv-progress-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.fv-page-build-status{font-size:12px;font-weight:800;color:#53606c;margin-top:6px}
`;
document.head.appendChild(s)}
function ensureBar(){ensureStyle();let bar=document.getElementById('fvProgressBar');if(bar)return bar;bar=document.createElement('div');bar.id='fvProgressBar';document.body.appendChild(bar);return bar}
function refreshBar(){const bar=ensureBar(),mode=currentMode(),n=currentSelected();if(!mode||!Number.isFinite(n)){bar.classList.remove('show');return}const st=getStatus(mode,n),stages=STAGES[mode]||[];bar.innerHTML=`<div class="fv-progress-head"><div><div class="fv-progress-title">${mode} ${n}</div><div class="fv-progress-sub">${st?`Current: ${st.label}`:'Choose stage, then take the progress photo.'}</div></div><button class="fv-progress-close" type="button">Close</button></div><div class="fv-progress-grid">${stages.map(x=>`<button type="button" class="fv-progress-btn" data-stage="${x.id}" style="background:${x.color}">${x.label}</button>`).join('')}</div>`;bar.classList.add('show');bar.querySelector('.fv-progress-close').onclick=()=>bar.classList.remove('show');bar.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{const stage=stageById(mode,b.dataset.stage);if(!stage)return;pending={mode,n,stage};try{if(typeof toast==='function')toast(`${mode} ${n}: take photo for ${stage.label}`)}catch{};camera.click()})}
function observeSelection(){document.addEventListener('click',e=>{if(e.target.closest?.('#pins .pin'))setTimeout(()=>{refreshBar();applyPinColors()},30)},true);filter.addEventListener('change',()=>setTimeout(()=>{refreshBar();applyPinColors()},60));new MutationObserver(()=>applyPinColors()).observe(pins,{childList:true,subtree:true})}
camera.addEventListener('change',()=>{if(!pending)return;if(!camera.files||!camera.files.length){pending=null;return}const p=pending;pending=null;setTimeout(()=>{saveStatus(p.mode,p.n,p.stage);applyPinColors();refreshBar();try{if(typeof toast==='function')toast(`${p.mode} ${p.n}: ${p.stage.label} saved`)}catch{}},250)},true);

async function dbDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function getSetting(id){const db=await openDB(),tx=db.transaction('settings','readonly'),q=tx.objectStore('settings').get(id);const item=await new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});await dbDone(tx);return item}
async function putSetting(item){const db=await openDB(),tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(item);await dbDone(tx)}
function isPdf(item){return item&&(item.type==='application/pdf'||String(item.name||'').toLowerCase().endsWith('.pdf'))}
async function pdfDoc(blob){if(typeof pdfInfo==='function')return pdfInfo(blob);const pdfjs=await import('./pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./pdf.worker.min.mjs';return pdfjs.getDocument({data:await blob.arrayBuffer()}).promise}
function canvasBlob(canvas){return new Promise(resolve=>canvas.toBlob(b=>resolve(b),'image/jpeg',0.72))}
async function makeThumb(item,meta){if(item.thumbBlob instanceof Blob)return item.thumbBlob;if(!item.blob)return null;if(!isPdf(item))return item.blob;const pdf=await pdfDoc(item.blob),page=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,item.pageNumber||meta.pageNumber||1))),base=page.getViewport({scale:1}),scale=Math.min(1,360/Math.max(base.width,base.height)),vp=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:vp}).promise;const blob=await canvasBlob(canvas);canvas.width=canvas.height=1;if(blob){item.thumbBlob=blob;item.thumbVersion='10.25.9';await putSetting(item)}return blob}
function showBlob(host,blob){if(!blob){host.textContent='Preview unavailable';return}const img=document.createElement('img'),url=URL.createObjectURL(blob);img.style.cssText='width:100%;height:100%;object-fit:contain;display:block';img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);img.src=url;host.replaceChildren(img)}
async function openCachedPages(e){const mode=currentMode();if(!mode)return;const manager=window.FIELDVERIFY_DRAWING_MANAGER;if(!manager||typeof manager.library!=='function')return;const rows=manager.library().filter(x=>x.projectId===pid()&&x.category===mode).sort((a,b)=>(Number(a.pageNumber)||0)-(Number(b.pageNumber)||0));if(!rows.length)return;e.preventDefault();e.stopImmediatePropagation();document.getElementById('fvDrawingPagesModal')?.remove();const modal=document.createElement('div');modal.id='fvDrawingPagesModal';modal.className='fv-drawing-modal';modal.innerHTML=`<div class="fv-drawing-box" style="width:min(760px,100%)"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div><h2 style="margin:0">${mode} Drawing Pages</h2><div class="fv-page-build-status" id="fvThumbStatus">Loading saved page previews…</div></div><button id="fvPagesClose" style="padding:10px;background:#e7edf4">Close</button></div><div class="fv-page-grid">${rows.map((x,i)=>`<button class="fv-page-card" data-id="${String(x.id).replace(/"/g,'&quot;')}"><div class="fv-page-thumb" data-fvthumb="${i}"><span style="font-size:12px;color:#687480">Loading preview…</span></div><div class="fv-page-label" style="white-space:normal">${(x.baseDescription||x.description||'Drawing').replace(/[&<>]/g,'')} · Page ${x.pageNumber||i+1} of ${x.pageCount||rows.length}</div></button>`).join('')}</div></div>`;document.body.appendChild(modal);modal.querySelector('#fvPagesClose').onclick=()=>modal.remove();modal.querySelectorAll('.fv-page-card').forEach(b=>b.onclick=()=>{const select=document.getElementById('drawingFilter');if(select){select.value=b.dataset.id;select.dispatchEvent(new Event('change',{bubbles:true}))}modal.remove()});const status=modal.querySelector('#fvThumbStatus');let done=0;for(let i=0;i<rows.length;i++){const host=modal.querySelector(`[data-fvthumb="${i}"]`);if(!host)continue;try{const item=await getSetting(rows[i].id),blob=await makeThumb(item||{},rows[i]);showBlob(host,blob)}catch(err){host.textContent='Preview unavailable';console.warn('Cached thumbnail',err)}done++;status.textContent=`Page previews ready: ${done} of ${rows.length}`;await new Promise(r=>setTimeout(r,0))}status.textContent=`All ${rows.length} page previews ready and saved.`}
document.addEventListener('click',e=>{const b=e.target.closest?.('#drawingPagesBtn');if(!b)return;if(currentMode())openCachedPages(e)},true);
ensureStyle();observeSelection();applyPinColors();
window.FIELDVERIFY_PROGRESS={version:VERSION,status:(mode,n)=>getStatus(mode,n),stages:STAGES};
console.info(`FieldVerify ERS/Tieback progress ${VERSION} loaded`);
})();
