(()=>{
'use strict';
const VERSION='10.25.53-location-aware-ers-picker';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
const META_KEY='fieldVerifyDrawingLibraryV1024';
let down=null,lastTap=0,walerStart=null,readToken=0;
function active(){return filter.value==='ERS'||filter.value==='Tieback'||filter.value==='Waler'}
function say(s){try{toast(s)}catch{}}
function ensureStyle(){if(document.getElementById('fvErsCropStyle'))return;const s=document.createElement('style');s.id='fvErsCropStyle';s.textContent=`
#map.fv-ers-crop-active,#map.fv-ers-crop-active img{touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#fvErsCropModal{position:fixed;inset:0;z-index:1950;background:#0008;display:flex;align-items:center;justify-content:center;padding:14px;line-height:normal}
#fvErsCropCard{width:min(96vw,760px);max-height:94vh;overflow:hidden;background:#fff;color:#16202a;border-radius:20px;padding:14px;box-shadow:0 12px 42px #000c}
#fvErsCropCard h3{margin:0 0 4px;font-size:24px}#fvErsCropCard p{margin:0 0 10px;color:#65717c;font-size:13px}
#fvErsCropStage{position:relative;width:100%;aspect-ratio:1/1;background:#eef2f6;border:1px solid #cbd3dc;border-radius:14px;overflow:hidden;touch-action:manipulation}
#fvErsCropCanvas{display:block;width:100%;height:100%}
#fvErsCropOverlay{position:absolute;inset:0;pointer-events:none}
#fvErsCropOverlay .fv-page-virtual{position:absolute;transform:translate(-50%,-50%);min-width:74px;height:48px;padding:0 8px;border:3px solid #c32727;border-radius:10px;background:#fff;color:#8e1717;font-size:20px;font-weight:900;line-height:40px;text-align:center;box-shadow:0 2px 8px #0007;pointer-events:auto;touch-action:manipulation}
#fvErsCropOverlay .fv-page-virtual:active{background:#16803d;color:#fff;border-color:#fff}
#fvErsCropOverlay .fv-waler-first{background:#fff3cd;border-color:#b77900;color:#6b4700}
#fvErsCropMessage{position:absolute;left:8%;right:8%;bottom:7%;background:#ffffffee;color:#37424d;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:800;text-align:center;line-height:1.25;box-shadow:0 2px 9px #0004}
#fvErsCropClose{width:100%;min-height:48px;margin-top:10px;border-radius:12px;background:#e7edf4;color:#16202a;font-weight:900}
@media(max-width:520px){#fvErsCropOverlay .fv-page-virtual{min-width:64px;height:44px;font-size:16px;line-height:36px}}
`;document.head.appendChild(s)}
function closeModal(){readToken++;const x=document.getElementById('fvErsCropModal');if(x&&x.parentNode)x.parentNode.removeChild(x)}
function drawingSelect(){return document.getElementById('drawingFilter')}
function drawingMeta(){try{const f=drawingSelect(),id=f&&f.value;if(!id)return null;const rows=JSON.parse(localStorage.getItem(META_KEY)||'[]');if(!Array.isArray(rows))return null;return rows.find(x=>x&&String(x.id)===String(id))||null}catch{return null}}
function dbReq(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function getSetting(id){if(!id||typeof openDB!=='function')return null;const db=await openDB(),tx=db.transaction('settings','readonly');const item=await dbReq(tx.objectStore('settings').get(id));await txDone(tx);return item||null}
async function resolvePdf(){const meta=drawingMeta();if(!meta)return null;let item=await getSetting(meta.id);if(!item?.blob&&meta.sourceId)item=await getSetting(meta.sourceId);if(!item?.blob)return null;const isPdf=item.type==='application/pdf'||String(item.name||meta.name||'').toLowerCase().endsWith('.pdf');if(!isPdf)return null;return{blob:item.blob,page:Math.max(1,Number(meta.pageNumber||item.pageNumber||1)||1)}}
function displayId(n){return `E-${n}`}
function walerKey(a,b){const lo=Math.min(a,b),hi=Math.max(a,b);return 900000000+lo*1000+hi}
function selectWalerEndpoint(n){
 try{
   if(walerStart==null){walerStart=n;closeModal();say(`Waler start ${displayId(n)} selected. Tap the drawing and choose the ending tie.`);return}
   const first=walerStart;walerStart=null;const lo=Math.min(first,n),hi=Math.max(first,n),span=hi-lo;
   if(span>12){say('A waler can span up to 12 tie numbers. Choose an ending tie within 12.');walerStart=first;return}
   const key=walerKey(first,n),label=first===n?displayId(n):`${displayId(lo)}–${displayId(hi)}`;
   if(typeof records!=='undefined'&&typeof rec==='function'){records[key]={...rec(key),itemType:'Waler',itemLabel:label,walerStart:lo,walerEnd:hi,coveredTies:Array.from({length:hi-lo+1},(_,i)=>lo+i)};if(typeof persist==='function')persist()}
   if(typeof selected!=='undefined')selected=key;if(typeof nearest!=='undefined')nearest=null;
   const q=document.getElementById('search');if(q)q.value=label;closeModal();if(typeof showTarget==='function')showTarget();say(`Waler ${label} selected`)
 }catch(e){console.warn('Waler range select failed',e)}
}
function selectNumber(n){
 if(filter.value==='Waler'){selectWalerEndpoint(n);return}
 try{const id=displayId(n);if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:id};if(typeof persist==='function')persist()}if(typeof selected!=='undefined')selected=n;if(typeof nearest!=='undefined')nearest=null;const q=document.getElementById('search');if(q)q.value=id;closeModal();if(typeof showTarget==='function')showTarget();say(`${filter.value==='ERS'?'Sheet Number':'Tieback'} ${id} selected`)}catch(e){console.warn('ERS/Tieback crop select failed',e)}
}
function mapPoint(clientX,clientY){const r=plan.getBoundingClientRect();if(!r.width||!r.height)return null;const x=clientX-r.left,y=clientY-r.top;if(x<0||y<0||x>r.width||y>r.height)return null;return{x,y,r,nx:x/r.width,ny:y/r.height}}
function numberParts(str){
 const s=String(str||''),out=[];
 for(const m of s.matchAll(/(?:\bE\s*[-–—]?\s*)?(\d{3})\b/gi)){const n=Number(m[1]);if(n>=100&&n<=499)out.push({n,index:m.index||0,len:m[0].length,explicit:/E/i.test(m[0])})}
 for(const m of s.matchAll(/\d{6,}/g)){const raw=m[0];if(raw.length%3)continue;for(let i=0;i<raw.length;i+=3){const n=Number(raw.slice(i,i+3));if(n>=100&&n<=499)out.push({n,index:(m.index||0)+i,len:3,explicit:false})}}
 return out
}
async function localNumbers(bounds){
 const src=await resolvePdf();if(!src||typeof pdfInfo!=='function')return[];
 const pdf=await pdfInfo(src.blob),page=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,src.page))),vp=page.getViewport({scale:1}),text=await page.getTextContent(),cands=[];
 for(const item of text.items||[]){
   if(!item?.transform)continue;const str=String(item.str||''),parts=numberParts(str);if(!parts.length)continue;
   const a=Number(item.transform[0])||1,b=Number(item.transform[1])||0,norm=Math.hypot(a,b)||1,ux=a/norm,uy=b/norm,w=Number(item.width)||0;
   for(const p of parts){
     const frac=str.length?Math.max(0,Math.min(1,(p.index+p.len/2)/str.length)):.5;
     const px=(Number(item.transform[4])||0)+ux*w*frac,py=(Number(item.transform[5])||0)+uy*w*frac;
     const point=vp.convertToViewportPoint(px,py),nx=point[0]/vp.width,ny=point[1]/vp.height;
     const padX=(bounds.x2-bounds.x1)*.12,padY=(bounds.y2-bounds.y1)*.18;
     if(nx>=bounds.x1-padX&&nx<=bounds.x2+padX&&ny>=bounds.y1-padY&&ny<=bounds.y2+padY)cands.push({n:p.n,nx,ny,explicit:p.explicit})
   }
 }
 try{page.cleanup?.()}catch{}
 const explicit=cands.filter(x=>x.explicit);const pool=explicit.length?explicit:cands;
 const uniq=[];for(const c of pool){if(!uniq.some(x=>x.n===c.n&&Math.abs(x.nx-c.nx)<.004&&Math.abs(x.ny-c.ny)<.004))uniq.push(c)}
 return uniq.sort((a,b)=>a.nx-b.nx||a.ny-b.ny)
}
function addLocalButtons(overlay,nums,bounds){
 overlay.replaceChildren();
 const msg=document.createElement('div');msg.id='fvErsCropMessage';
 if(!nums.length){msg.textContent='No selectable 3-digit item numbers were detected in this enlarged area. Tap closer to the number row.';overlay.appendChild(msg);return}
 for(const p of nums){
   const x=(p.nx-bounds.x1)/(bounds.x2-bounds.x1)*100,y=(p.ny-bounds.y1)/(bounds.y2-bounds.y1)*100;
   if(x<-5||x>105||y<-5||y>105)continue;
   const b=document.createElement('button');b.type='button';b.className='fv-page-virtual'+(filter.value==='Waler'&&walerStart===p.n?' fv-waler-first':'');b.textContent=displayId(p.n);b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label',`Select ${filter.value} ${displayId(p.n)}`);b.onclick=()=>selectNumber(p.n);overlay.appendChild(b)
 }
 if(!overlay.querySelector('.fv-page-virtual')){msg.textContent='Numbers were found nearby, but not inside this exact crop. Tap closer to the number row.';overlay.appendChild(msg)}
}
async function drawCrop(clientX,clientY){
 const pt=mapPoint(clientX,clientY);if(!pt){say('Tap directly on the drawing');return}closeModal();const token=++readToken;
 const type=filter.value,title=type==='ERS'?'Select sheet number':type==='Tieback'?'Select tieback number':(walerStart==null?'Select first tie for Waler':'Select ending tie for Waler');
 const help=type==='Waler'?(walerStart==null?'Tap the first tie covered by this waler.':'Tap the last tie covered by this waler. Maximum span is 12 tie numbers.'):'Only numbers from the area you tapped are shown.';
 const modal=document.createElement('div');modal.id='fvErsCropModal';modal.innerHTML=`<div id="fvErsCropCard"><h3>${title}</h3><p>${help}</p><div id="fvErsCropStage"><canvas id="fvErsCropCanvas" width="1200" height="1200"></canvas><div id="fvErsCropOverlay"><div id="fvErsCropMessage">Reading numbers from this part of the drawing…</div></div></div><button id="fvErsCropClose" type="button">Close</button></div>`;
 document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});modal.querySelector('#fvErsCropClose').onclick=closeModal;
 const canvas=modal.querySelector('#fvErsCropCanvas'),ctx=canvas.getContext('2d'),nw=plan.naturalWidth||Math.round(pt.r.width),nh=plan.naturalHeight||Math.round(pt.r.height),cx=pt.nx*nw,cy=pt.ny*nh;
 const crop=Math.max(120,Math.min(nw,nh)*.12),sw=Math.min(crop,nw),sh=Math.min(crop,nh);let sx=cx-sw/2,sy=cy-sh/2;sx=Math.max(0,Math.min(nw-sw,sx));sy=Math.max(0,Math.min(nh-sh,sy));
 try{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(plan,sx,sy,sw,sh,0,0,canvas.width,canvas.height)}catch(e){console.warn('ERS/Tieback/Waler crop draw',e);say('Could not enlarge this drawing area')}
 const bounds={x1:sx/nw,y1:sy/nh,x2:(sx+sw)/nw,y2:(sy+sh)/nh};
 try{const nums=await localNumbers(bounds);if(token!==readToken||!document.getElementById('fvErsCropModal'))return;addLocalButtons(modal.querySelector('#fvErsCropOverlay'),nums,bounds)}catch(e){console.warn('Local ERS number read failed',e);const msg=modal.querySelector('#fvErsCropMessage');if(msg)msg.textContent='Could not read numbers from this area. Try tapping directly on the number.'}
}
function syncMode(){if(active())map.classList.add('fv-ers-crop-active');else{map.classList.remove('fv-ers-crop-active');closeModal();walerStart=null}}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('button,input,select,textarea')))return;down={x:e.clientX,y:e.clientY,moved:false}},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.sqrt(dx*dx+dy*dy)>12)down.moved=true},{passive:true});
map.addEventListener('pointercancel',()=>{down=null},{passive:true});
map.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(!active()||d.moved)return;const now=Date.now();if(now-lastTap<280){lastTap=0;return}lastTap=now;drawCrop(e.clientX,e.clientY)},{passive:true});
map.addEventListener('dblclick',e=>{if(active()){e.preventDefault();e.stopImmediatePropagation()}},true);
filter.addEventListener('change',syncMode,true);document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter')closeModal()},true);
ensureStyle();syncMode();window.FIELDVERIFY_ERS_TOUCH={version:VERSION,close:closeModal,openAt:drawCrop};console.info(`FieldVerify location-aware ERS/Tieback/Waler picker ${VERSION} loaded`);
})();