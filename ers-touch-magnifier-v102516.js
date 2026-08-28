(()=>{
'use strict';
const VERSION='10.25.31-ers-clean-page-numbers-2';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
const META_KEY='fieldVerifyDrawingLibraryV1024';
let down=null,lastTap=0;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function say(s){try{toast(s)}catch{}}
function ensureStyle(){if(document.getElementById('fvErsCropStyle'))return;const s=document.createElement('style');s.id='fvErsCropStyle';s.textContent=`
#map.fv-ers-crop-active,#map.fv-ers-crop-active img{touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#fvErsCropModal{position:fixed;inset:0;z-index:1950;background:#0008;display:flex;align-items:center;justify-content:center;padding:14px;line-height:normal}
#fvErsCropCard{width:min(96vw,760px);max-height:94vh;overflow:hidden;background:#fff;color:#16202a;border-radius:20px;padding:14px;box-shadow:0 12px 42px #000c}
#fvErsCropCard h3{margin:0 0 4px;font-size:24px}#fvErsCropCard p{margin:0 0 10px;color:#65717c;font-size:13px}
#fvErsCropStage{position:relative;width:100%;aspect-ratio:1/1;background:#eef2f6;border:1px solid #cbd3dc;border-radius:14px;overflow:hidden;touch-action:manipulation}
#fvErsCropCanvas{display:block;width:100%;height:100%}
#fvErsCropOverlay{position:absolute;inset:0;pointer-events:none}
#fvErsCropOverlay .fv-page-virtual{position:absolute;transform:translate(-50%,-50%);min-width:82px;height:50px;padding:0 8px;border:3px solid #c32727;border-radius:10px;background:#fff;color:#8e1717;font-size:21px;font-weight:900;line-height:42px;text-align:center;box-shadow:0 2px 8px #0007;pointer-events:auto;touch-action:manipulation}
#fvErsCropOverlay .fv-page-virtual:active{background:#16803d;color:#fff;border-color:#fff}
#fvErsCropClose{width:100%;min-height:48px;margin-top:10px;border-radius:12px;background:#e7edf4;color:#16202a;font-weight:900}
@media(max-width:520px){#fvErsCropOverlay .fv-page-virtual{min-width:66px;height:44px;font-size:16px;line-height:36px}}
`;document.head.appendChild(s)}
function closeModal(){const x=document.getElementById('fvErsCropModal');if(x&&x.parentNode)x.parentNode.removeChild(x)}
function drawingSelect(){return document.getElementById('drawingFilter')}
function drawingLabel(){const f=drawingSelect();const opt=f&&f.options&&f.selectedIndex>=0?f.options[f.selectedIndex]:null;return String((opt&&opt.textContent)||'').trim()}
function drawingMeta(){try{const f=drawingSelect(),id=f&&f.value;if(!id)return null;const rows=JSON.parse(localStorage.getItem(META_KEY)||'[]');if(!Array.isArray(rows))return null;return rows.find(x=>x&&x.id===id)||null}catch{return null}}
function sheetNumber(){
 const label=drawingLabel().toUpperCase();
 let m=label.match(/ERS\s*[-_ ]?\s*(\d+)/);if(m)return Number(m[1]);
 const meta=drawingMeta();
 const parts=[meta&&meta.description,meta&&meta.baseDescription,meta&&meta.name].filter(Boolean).join(' ').toUpperCase();
 m=parts.match(/ERS\s*[-_ ]?\s*(\d+)/);if(m)return Number(m[1]);
 const p=Number(meta&&meta.pageNumber);if(Number.isInteger(p)&&p>0)return p;
 const pageMatch=label.match(/PAGE\s+(\d+)/);if(pageMatch)return Number(pageMatch[1]);
 return null
}
function pageNumbers(){
 if(filter.value!=='ERS')return[];
 const page=sheetNumber();
 if(!Number.isInteger(page)||page<1)return[];
 // User-confirmed anchor: ERS-6 contains E-244 through E-233. Continue 12 numbers per sheet.
 const start=244+(6-page)*12;
 const nums=[];for(let i=0;i<12;i++){const n=start-i;if(n>0)nums.push(n)}return nums;
}
function selectNumber(n){try{if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:filter.value==='ERS'?`E-${n}`:String(n)};if(typeof persist==='function')persist()}if(typeof selected!=='undefined')selected=n;const q=document.getElementById('search');if(q)q.value=String(n);if(typeof showTarget==='function')showTarget();say(`${filter.value==='ERS'?'E-':''}${n} selected`)}catch(e){console.warn('ERS crop select failed',e)}}
function mapPoint(clientX,clientY){const r=plan.getBoundingClientRect();if(!r.width||!r.height)return null;const x=clientX-r.left,y=clientY-r.top;if(x<0||y<0||x>r.width||y>r.height)return null;return{x,y,r,nx:x/r.width,ny:y/r.height}}
function addVirtualButtons(overlay,nums){if(!nums.length)return;const count=nums.length;for(let i=0;i<count;i++){const n=nums[i],b=document.createElement('button');b.type='button';b.className='fv-page-virtual';b.textContent=`E-${n}`;const x=5+(90*(i/(count-1)));const y=(i%2===0)?73:82;b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label',`Select E-${n}`);b.onclick=()=>{closeModal();selectNumber(n)};overlay.appendChild(b)}}
function drawCrop(clientX,clientY){
 const pt=mapPoint(clientX,clientY);if(!pt){say('Tap directly on the drawing');return}closeModal();
 const page=sheetNumber(),nums=pageNumbers();
 const modal=document.createElement('div');modal.id='fvErsCropModal';modal.innerHTML='<div id="fvErsCropCard"><h3>Select ERS number</h3><p>Tap the clean number directly over the enlarged drawing.</p><div id="fvErsCropStage"><canvas id="fvErsCropCanvas" width="1200" height="1200"></canvas><div id="fvErsCropOverlay"></div></div><button id="fvErsCropClose" type="button">Close</button></div>';
 document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});modal.querySelector('#fvErsCropClose').onclick=closeModal;
 const canvas=modal.querySelector('#fvErsCropCanvas'),ctx=canvas.getContext('2d'),nw=plan.naturalWidth||Math.round(pt.r.width),nh=plan.naturalHeight||Math.round(pt.r.height),cx=pt.nx*nw,cy=pt.ny*nh;
 const crop=Math.max(120,Math.min(nw,nh)*.12),sw=Math.min(crop,nw),sh=Math.min(crop,nh);let sx=cx-sw/2,sy=cy-sh/2;sx=Math.max(0,Math.min(nw-sw,sx));sy=Math.max(0,Math.min(nh-sh,sy));
 try{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(plan,sx,sy,sw,sh,0,0,canvas.width,canvas.height)}catch(e){console.warn('ERS crop draw',e);say('Could not enlarge this drawing area')}
 addVirtualButtons(modal.querySelector('#fvErsCropOverlay'),nums);
 if(!nums.length)say('ERS page could not be identified. Open the Pages menu and reselect this sheet.');
 else console.info(`ERS virtual numbers: sheet/page ${page}, E-${nums[0]} through E-${nums[nums.length-1]}`)
}
function syncMode(){if(active())map.classList.add('fv-ers-crop-active');else{map.classList.remove('fv-ers-crop-active');closeModal()}}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('button,input,select,textarea')))return;down={x:e.clientX,y:e.clientY,moved:false}},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.sqrt(dx*dx+dy*dy)>12)down.moved=true},{passive:true});
map.addEventListener('pointercancel',()=>{down=null},{passive:true});
map.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(!active()||d.moved)return;const now=Date.now();if(now-lastTap<280){lastTap=0;return}lastTap=now;drawCrop(e.clientX,e.clientY)},{passive:true});
map.addEventListener('dblclick',e=>{if(active()){e.preventDefault();e.stopImmediatePropagation()}},true);
filter.addEventListener('change',syncMode,true);document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter')closeModal()},true);
ensureStyle();syncMode();window.FIELDVERIFY_ERS_TOUCH={version:VERSION,close:closeModal,openAt:drawCrop,sheetNumber};console.info(`FieldVerify ERS crop picker ${VERSION} loaded`);
})();