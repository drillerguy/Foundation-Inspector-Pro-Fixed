(()=>{
'use strict';
const VERSION='10.25.56-original-pdf-loupe';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
const META_KEY='fieldVerifyDrawingLibraryV1024';
let down=null,renderToken=0,current=null;
const ZOOMS=[3,5,8,12,18];

function active(){return ['ERS','Tieback','Waler'].includes(filter.value)}
function say(s){try{toast(s)}catch{}}
function readMeta(){try{const x=JSON.parse(localStorage.getItem(META_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function meta(){const id=document.getElementById('drawingFilter')?.value;if(!id)return null;return readMeta().find(x=>String(x.id)===String(id))||null}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function setting(id){if(!id||typeof openDB!=='function')return null;const db=await openDB(),tx=db.transaction('settings','readonly'),v=await req(tx.objectStore('settings').get(id));await done(tx);return v||null}
async function source(){
 const m=meta();if(!m)return null;
 let item=await setting(m.id);if(!item?.blob&&m.sourceId)item=await setting(m.sourceId);
 if(!item?.blob)return null;
 const pdf=item.type==='application/pdf'||String(item.name||m.name||'').toLowerCase().endsWith('.pdf');
 return {blob:item.blob,isPdf:pdf,page:Math.max(1,Number(m.pageNumber||item.pageNumber||1)||1),name:m.name||m.description||item.name||'Drawing'};
}
function point(cx,cy){const r=plan.getBoundingClientRect();if(!r.width||!r.height)return null;const x=cx-r.left,y=cy-r.top;if(x<0||y<0||x>r.width||y>r.height)return null;return{nx:x/r.width,ny:y/r.height}}
function close(){renderToken++;current=null;document.getElementById('fvPdfLoupeModal')?.remove()}
function ensureStyle(){if(document.getElementById('fvPdfLoupeStyle'))return;const s=document.createElement('style');s.id='fvPdfLoupeStyle';s.textContent=`
#fvPdfLoupeModal{position:fixed;inset:0;z-index:2300;background:#000a;display:flex;align-items:center;justify-content:center;padding:12px;line-height:normal}
#fvPdfLoupeCard{width:min(96vw,820px);max-height:94vh;overflow:auto;background:#fff;color:#16202a;border-radius:18px;padding:14px;box-shadow:0 14px 45px #000b}
#fvPdfLoupeHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}#fvPdfLoupeHead h3{margin:0;font-size:22px}#fvPdfLoupeHead p{margin:3px 0 0;color:#63707c;font-size:13px}
#fvPdfLoupeStage{position:relative;width:100%;background:#eef2f6;border:1px solid #cbd3dc;border-radius:12px;overflow:hidden;touch-action:none}
#fvPdfLoupeCanvas{display:block;width:100%;height:auto;aspect-ratio:3/2;background:#fff}
#fvPdfLoupeCross{position:absolute;left:50%;top:50%;width:36px;height:36px;transform:translate(-50%,-50%);pointer-events:none;border:2px solid #d11b1b;border-radius:50%;box-shadow:0 0 0 1px #fff}
#fvPdfLoupeCross:before,#fvPdfLoupeCross:after{content:'';position:absolute;background:#d11b1b}.fv-a{}
#fvPdfLoupeCross:before{width:48px;height:2px;left:-8px;top:15px}#fvPdfLoupeCross:after{height:48px;width:2px;top:-8px;left:15px}
#fvPdfLoupeControls{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:10px}#fvPdfLoupeControls button{min-height:46px;padding:8px 16px;border-radius:10px;background:#083a73;color:#fff;font-weight:900;font-size:18px}#fvPdfLoupeZoom{text-align:center;font-weight:900}
#fvPdfLoupeSelect{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}#fvPdfLoupeSelect input{min-width:0;padding:12px;border:1px solid #c8d0d9;border-radius:10px;font-size:18px}#fvPdfLoupeSelect button{padding:10px 16px;border-radius:10px;background:#16803d;color:#fff;font-weight:900}
#fvPdfLoupeClose{width:100%;min-height:48px;margin-top:10px;border-radius:10px;background:#e7edf4;color:#16202a;font-weight:900}
#fvPdfLoupeStatus{font-size:12px;color:#66717c;margin-top:7px;text-align:center}
`;document.head.appendChild(s)}
function display(n){return `E-${n}`}
function selectNumber(n){
 try{
  const id=display(n),type=filter.value;
  if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:type,itemLabel:id};if(typeof persist==='function')persist()}
  if(typeof selected!=='undefined')selected=n;if(typeof nearest!=='undefined')nearest=null;
  const q=document.getElementById('search');if(q)q.value=id;
  close();if(typeof showTarget==='function')showTarget();say(`${type==='ERS'?'Sheet Number':type} ${id} selected`);
 }catch(e){console.warn('Loupe select failed',e)}
}
async function openPdf(src){if(typeof pdfInfo==='function')return pdfInfo(src.blob);const pdfjs=await import('./pdf.min.mjs');if(pdfjs.GlobalWorkerOptions)pdfjs.GlobalWorkerOptions.workerSrc='./pdf.worker.min.mjs';return pdfjs.getDocument({data:await src.blob.arrayBuffer()}).promise}
async function renderPdf(){
 if(!current)return;const mine=++renderToken,canvas=document.getElementById('fvPdfLoupeCanvas'),status=document.getElementById('fvPdfLoupeStatus');if(!canvas)return;
 try{
  if(status)status.textContent='Rendering from original PDF…';
  const pdf=await openPdf(current.src);if(mine!==renderToken||!current)return;
  const page=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,current.src.page))),base=page.getViewport({scale:1});
  const mag=ZOOMS[current.zoomIndex],cw=1200,ch=800;
  canvas.width=cw;canvas.height=ch;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);
  const targetX=current.nx*base.width,targetY=current.ny*base.height;
  let left=targetX-cw/(2*mag),top=targetY-ch/(2*mag);
  left=Math.max(0,Math.min(Math.max(0,base.width-cw/mag),left));top=Math.max(0,Math.min(Math.max(0,base.height-ch/mag),top));
  current.nx=Math.max(0,Math.min(1,(left+cw/(2*mag))/base.width));current.ny=Math.max(0,Math.min(1,(top+ch/(2*mag))/base.height));
  await page.render({canvasContext:ctx,viewport:base,transform:[mag,0,0,mag,-left*mag,-top*mag],background:'#ffffff'}).promise;
  try{page.cleanup?.()}catch{}
  if(mine!==renderToken)return;
  const z=document.getElementById('fvPdfLoupeZoom');if(z)z.textContent=`${mag}× magnification`;
  if(status)status.textContent='Original PDF detail — drag to pan, use + / − to zoom.';
 }catch(e){console.warn('PDF loupe render failed',e);if(status)status.textContent='High-resolution PDF render failed. Showing the loaded drawing image instead.';renderRaster()}
}
function renderRaster(){
 if(!current)return;const canvas=document.getElementById('fvPdfLoupeCanvas');if(!canvas)return;const cw=1200,ch=800;canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);
 const nw=plan.naturalWidth||1,nh=plan.naturalHeight||1,mag=ZOOMS[current.zoomIndex],sw=Math.min(nw,cw/mag),sh=Math.min(nh,ch/mag),cx=current.nx*nw,cy=current.ny*nh;let sx=Math.max(0,Math.min(nw-sw,cx-sw/2)),sy=Math.max(0,Math.min(nh-sh,cy-sh/2));ctx.imageSmoothingEnabled=false;ctx.drawImage(plan,sx,sy,sw,sh,0,0,cw,ch);const z=document.getElementById('fvPdfLoupeZoom');if(z)z.textContent=`${mag}× magnification`;
}
function render(){if(!current)return;if(current.src.isPdf)renderPdf();else renderRaster()}
async function openAt(cx,cy){
 const p=point(cx,cy);if(!p)return;close();const src=await source();if(!src){say('Drawing source is unavailable');return}
 current={src,nx:p.nx,ny:p.ny,zoomIndex:2,drag:null};
 const modal=document.createElement('div');modal.id='fvPdfLoupeModal';modal.innerHTML=`<div id="fvPdfLoupeCard"><div id="fvPdfLoupeHead"><div><h3>Drawing Magnifier</h3><p>Look at the actual box number before selecting it.</p></div></div><div id="fvPdfLoupeStage"><canvas id="fvPdfLoupeCanvas" width="1200" height="800"></canvas><div id="fvPdfLoupeCross"></div></div><div id="fvPdfLoupeControls"><button type="button" id="fvPdfLoupeMinus">−</button><div id="fvPdfLoupeZoom">8× magnification</div><button type="button" id="fvPdfLoupePlus">+</button></div><div id="fvPdfLoupeSelect"><input id="fvPdfLoupeNumber" inputmode="numeric" placeholder="Type visible number"><button type="button" id="fvPdfLoupeChoose">SELECT</button></div><div id="fvPdfLoupeStatus">Opening original drawing…</div><button type="button" id="fvPdfLoupeClose">Close</button></div>`;
 document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)close()});modal.querySelector('#fvPdfLoupeClose').onclick=close;
 modal.querySelector('#fvPdfLoupeMinus').onclick=()=>{if(!current)return;current.zoomIndex=Math.max(0,current.zoomIndex-1);render()};modal.querySelector('#fvPdfLoupePlus').onclick=()=>{if(!current)return;current.zoomIndex=Math.min(ZOOMS.length-1,current.zoomIndex+1);render()};
 const inp=modal.querySelector('#fvPdfLoupeNumber');modal.querySelector('#fvPdfLoupeChoose').onclick=()=>{const n=Number(String(inp.value||'').replace(/\D/g,''));if(n>=100&&n<=999)selectNumber(n);else say('Enter the visible 3-digit number')};
 const stage=modal.querySelector('#fvPdfLoupeStage');stage.addEventListener('pointerdown',e=>{if(!current)return;current.drag={x:e.clientX,y:e.clientY,nx:current.nx,ny:current.ny};stage.setPointerCapture?.(e.pointerId);e.preventDefault()});stage.addEventListener('pointermove',e=>{if(!current?.drag)return;e.preventDefault();const r=stage.getBoundingClientRect(),mag=ZOOMS[current.zoomIndex],dx=(e.clientX-current.drag.x)/Math.max(1,r.width),dy=(e.clientY-current.drag.y)/Math.max(1,r.height);current.nx=Math.max(0,Math.min(1,current.drag.nx-dx/mag*3));current.ny=Math.max(0,Math.min(1,current.drag.ny-dy/mag*2));clearTimeout(stage._fvPanTimer);stage._fvPanTimer=setTimeout(render,40)});stage.addEventListener('pointerup',()=>{if(current)current.drag=null});stage.addEventListener('pointercancel',()=>{if(current)current.drag=null});
 render();
}
function ignore(e){return !!e.target?.closest?.('#fvPdfLoupeModal,#fvMarkupTools,.map-controls,button,input,select,textarea')}
map.addEventListener('pointerdown',e=>{if(!active()||ignore(e))return;down={x:e.clientX,y:e.clientY,m:false}},true);
map.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>12)down.m=true},true);
map.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(!active()||d.m||ignore(e))return;e.preventDefault();e.stopImmediatePropagation();openAt(e.clientX,e.clientY)},true);
filter.addEventListener('change',close,true);document.addEventListener('change',e=>{if(e.target?.id==='drawingFilter')close()},true);
ensureStyle();window.FIELDVERIFY_PDF_LOUPE={version:VERSION,openAt,close};console.info(`FieldVerify PDF loupe ${VERSION} loaded`);
})();