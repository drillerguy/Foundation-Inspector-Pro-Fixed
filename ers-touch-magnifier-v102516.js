(()=>{
'use strict';
const VERSION='10.25.28-ers-crop-virtual-boxes';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
const OLD_MARKER_KEY='fieldVerifyTouchMarkersV102516';
let down=null,lastTap=0;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function say(s){try{toast(s)}catch{}}
function ensureStyle(){if(document.getElementById('fvErsCropStyle'))return;const s=document.createElement('style');s.id='fvErsCropStyle';s.textContent=`
#map.fv-ers-crop-active,#map.fv-ers-crop-active img{touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#fvErsCropModal{position:fixed;inset:0;z-index:1950;background:#0008;display:flex;align-items:center;justify-content:center;padding:14px;line-height:normal}
#fvErsCropCard{width:min(96vw,700px);max-height:94vh;overflow:auto;background:#fff;color:#16202a;border-radius:20px;padding:14px;box-shadow:0 12px 42px #000c}
#fvErsCropCard h3{margin:0 0 5px;font-size:22px}#fvErsCropCard p{margin:0 0 10px;color:#65717c;font-size:13px}
#fvErsCropStage{position:relative;width:100%;aspect-ratio:1/1;background:#eef2f6;border:1px solid #cbd3dc;border-radius:14px;overflow:hidden;touch-action:manipulation}
#fvErsCropCanvas{display:block;width:100%;height:100%;image-rendering:auto}
#fvErsCropOverlay{position:absolute;inset:0;pointer-events:none}
#fvErsCropOverlay .fv-crop-hot{position:absolute;transform:translate(-50%,-50%);min-width:64px;height:50px;padding:0 9px;border:3px solid #0b67c2;border-radius:11px;background:#fff;color:#083a73;font-size:21px;font-weight:900;line-height:42px;text-align:center;box-shadow:0 2px 8px #0006;pointer-events:auto;touch-action:manipulation}
#fvErsCropOverlay .fv-crop-hot:active{background:#16803d;color:#fff;border-color:#fff}
#fvErsCropOverlay .fv-page-virtual{min-width:72px;height:46px;border:3px solid #c32727;background:#fff;color:#9a1b1b;font-size:18px;line-height:38px;box-shadow:0 2px 7px #0007}
#fvErsCropOverlay .fv-page-virtual:before{content:'';position:absolute;inset:-6px;border-radius:14px;background:#ffffff55;z-index:-1}
#fvErsCropActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#fvErsCropActions button{min-height:48px;border-radius:12px;font-weight:900;padding:8px}
#fvErsCropClose{background:#e7edf4;color:#16202a}#fvErsCropNumbers{background:#083a73;color:#fff}
#fvErsNumberSheet{margin-top:10px;border-top:1px solid #d7dee7;padding-top:10px}
#fvErsNumberSheet .fv-number-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;max-height:260px;overflow:auto;-webkit-overflow-scrolling:touch}
#fvErsNumberSheet .fv-number{min-height:50px;border-radius:10px;background:#083a73;color:#fff;font-size:18px;font-weight:900;touch-action:manipulation}
#fvErsNumberSheet .fv-number.fv-known{background:#16803d}
#fvErsNumberSheet .fv-range-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
#fvErsNumberSheet .fv-range{min-height:48px;border-radius:10px;background:#e7edf4;color:#16202a;font-weight:900}
@media(max-width:520px){#fvErsCropOverlay .fv-page-virtual{min-width:58px;height:42px;font-size:15px;line-height:34px}#fvErsNumberSheet .fv-number-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#fvErsNumberSheet .fv-range-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(s)}
function closeModal(){const x=document.getElementById('fvErsCropModal');if(x&&x.parentNode)x.parentNode.removeChild(x)}
function projectId(){try{return String(typeof activeProjectId!=='undefined'&&activeProjectId||'legacy')}catch{return'legacy'}}
function drawingId(){const f=document.getElementById('drawingFilter');return f&&f.value||plan.src||'drawing'}
function drawingLabel(){const f=document.getElementById('drawingFilter');const opt=f&&f.options&&f.selectedIndex>=0?f.options[f.selectedIndex]:null;return String((opt&&opt.textContent)||drawingId()||'').trim()}
function markers(){try{const all=JSON.parse(localStorage.getItem(OLD_MARKER_KEY)||'{}');const key=`${projectId()}|${filter.value}|${drawingId()}`;const arr=all&&all[key];return Array.isArray(arr)?arr:[]}catch{return[]}}
function knownNumbers(){const out=[],seen={};try{if(typeof records==='object'&&records){for(const k in records){const n=Number(k),r=records[k];if(!Number.isInteger(n)||n<1||n>9999)continue;const t=r&&r.itemType||'Caisson';if(t!==filter.value)continue;if(!seen[n]){seen[n]=1;out.push(n)}}}}catch{}out.sort((a,b)=>a-b);return out}
function selectNumber(n){try{if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:filter.value==='ERS'?`E-${n}`:String(n)};if(typeof persist==='function')persist()}if(typeof selected!=='undefined')selected=n;const q=document.getElementById('search');if(q)q.value=String(n);if(typeof showTarget==='function')showTarget();say(`${filter.value==='ERS'?'E-':''}${n} selected`)}catch(e){console.warn('ERS crop select failed',e)}}
function mapPoint(clientX,clientY){const r=plan.getBoundingClientRect();if(!r.width||!r.height)return null;const x=clientX-r.left,y=clientY-r.top;if(x<0||y<0||x>r.width||y>r.height)return null;return{x,y,r,nx:x/r.width,ny:y/r.height}}
function markerChoicesAt(nx,ny){const out=[];for(const m of markers()){const n=Number(m&&m.n),x=Number(m&&m.x)/100,y=Number(m&&m.y)/100;if(!Number.isInteger(n)||!Number.isFinite(x)||!Number.isFinite(y))continue;const dx=x-nx,dy=y-ny,d=Math.sqrt(dx*dx+dy*dy);if(d<=.12)out.push({n,x,y,d})}out.sort((a,b)=>a.d-b.d);return out.slice(0,12)}
function pageVirtualNumbers(){const label=drawingLabel().toUpperCase();if(filter.value==='ERS'&&(label.includes('ERS-6')||label.includes('ERS 6')||label.includes('ERS_6'))){const a=[];for(let n=244;n>=233;n--)a.push(n);return a}return[]}
function addPageVirtualButtons(overlay){const nums=pageVirtualNumbers();if(!nums.length)return false;const count=nums.length;for(let i=0;i<count;i++){const n=nums[i],b=document.createElement('button');b.type='button';b.className='fv-crop-hot fv-page-virtual';b.textContent=`E-${n}`;const x=5+(90*(i/(count-1)));const y=(i%2===0)?75:84;b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label',`Select E-${n}`);b.onclick=()=>{closeModal();selectNumber(n)};overlay.appendChild(b)}return true}
function drawCrop(clientX,clientY){
 const pt=mapPoint(clientX,clientY);if(!pt){say('Tap directly on the drawing');return}closeModal();
 const modal=document.createElement('div');modal.id='fvErsCropModal';modal.innerHTML='<div id="fvErsCropCard"><h3>Select '+filter.value+' number</h3><p>Tap one of the clean virtual number boxes. The enlarged drawing stays underneath for reference.</p><div id="fvErsCropStage"><canvas id="fvErsCropCanvas" width="1200" height="1200"></canvas><div id="fvErsCropOverlay"></div></div><div id="fvErsCropActions"><button id="fvErsCropClose" type="button">Close</button><button id="fvErsCropNumbers" type="button">All Clean Numbers</button></div><div id="fvErsNumberSheet"></div></div>';
 document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});modal.querySelector('#fvErsCropClose').onclick=closeModal;modal.querySelector('#fvErsCropNumbers').onclick=()=>showRanges(modal.querySelector('#fvErsNumberSheet'));
 const canvas=modal.querySelector('#fvErsCropCanvas'),ctx=canvas.getContext('2d'),nw=plan.naturalWidth||Math.round(pt.r.width),nh=plan.naturalHeight||Math.round(pt.r.height),cx=pt.nx*nw,cy=pt.ny*nh;
 const crop=Math.max(120,Math.min(nw,nh)*.12),sw=Math.min(crop,nw),sh=Math.min(crop,nh);let sx=cx-sw/2,sy=cy-sh/2;sx=Math.max(0,Math.min(nw-sw,sx));sy=Math.max(0,Math.min(nh-sh,sy));
 try{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(plan,sx,sy,sw,sh,0,0,canvas.width,canvas.height)}catch(e){console.warn('ERS crop draw',e);say('Could not enlarge this drawing area')}
 const overlay=modal.querySelector('#fvErsCropOverlay');const pageButtons=addPageVirtualButtons(overlay);const choices=markerChoicesAt(pt.nx,pt.ny);
 if(!pageButtons){for(const m of choices){const mx=m.x*nw,my=m.y*nh;if(mx<sx||mx>sx+sw||my<sy||my>sy+sh)continue;const b=document.createElement('button');b.type='button';b.className='fv-crop-hot';b.textContent=filter.value==='ERS'?`E-${m.n}`:String(m.n);b.style.left=((mx-sx)/sw*100)+'%';b.style.top=((my-sy)/sh*100)+'%';b.onclick=()=>{closeModal();selectNumber(m.n)};overlay.appendChild(b)}}
 const stage=modal.querySelector('#fvErsCropStage');stage.addEventListener('click',e=>{if(e.target!==stage&&e.target!==canvas)return;showRanges(modal.querySelector('#fvErsNumberSheet'))});
 if(!pageButtons&&!choices.length)setTimeout(()=>showRanges(modal.querySelector('#fvErsNumberSheet')),150)
}
function showRanges(host){const pageNums=pageVirtualNumbers();if(pageNums.length){host.innerHTML='<p style="margin:0 0 8px;font-weight:900;color:#16202a">This sheet: E-244 through E-233</p>';const g=document.createElement('div');g.className='fv-number-grid';for(const n of pageNums){const b=document.createElement('button');b.type='button';b.className='fv-number';b.textContent=`E-${n}`;b.onclick=()=>{closeModal();selectNumber(n)};g.appendChild(b)}host.appendChild(g);return}host.innerHTML='<p style="margin:0 0 8px;font-weight:900;color:#16202a">Choose a number range</p>';const g=document.createElement('div');g.className='fv-range-grid';const known=knownNumbers(),max=Math.min(9999,Math.max(499,known.length?known[known.length-1]:499));for(let start=1;start<=max;start+=100){const end=Math.min(start+99,max),b=document.createElement('button');b.type='button';b.className='fv-range';b.textContent=`${start}–${end}`;b.onclick=()=>showNumbers(host,start,end);g.appendChild(b)}host.appendChild(g)}
function showNumbers(host,start,end){host.innerHTML='<p style="margin:0 0 8px;font-weight:900;color:#16202a">Tap the clean number that matches the enlarged drawing.</p>';const g=document.createElement('div');g.className='fv-number-grid',known=new Set(knownNumbers());for(let n=start;n<=end;n++){const b=document.createElement('button');b.type='button';b.className='fv-number'+(known.has(n)?' fv-known':'');b.textContent=filter.value==='ERS'?`E-${n}`:String(n);b.onclick=()=>{closeModal();selectNumber(n)};g.appendChild(b)}host.appendChild(g);const back=document.createElement('button');back.type='button';back.className='fv-range';back.style.width='100%';back.style.marginTop='8px';back.textContent='Back to ranges';back.onclick=()=>showRanges(host);host.appendChild(back)}
function syncMode(){if(active())map.classList.add('fv-ers-crop-active');else{map.classList.remove('fv-ers-crop-active');closeModal()}}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('button,input,select,textarea')))return;down={x:e.clientX,y:e.clientY,moved:false}},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.sqrt(dx*dx+dy*dy)>12)down.moved=true},{passive:true});
map.addEventListener('pointercancel',()=>{down=null},{passive:true});
map.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(!active()||d.moved)return;const now=Date.now();if(now-lastTap<280){lastTap=0;return}lastTap=now;drawCrop(e.clientX,e.clientY)},{passive:true});
map.addEventListener('dblclick',e=>{if(active()){e.preventDefault();e.stopImmediatePropagation()}},true);
filter.addEventListener('change',syncMode,true);document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter')closeModal()},true);
ensureStyle();syncMode();window.FIELDVERIFY_ERS_TOUCH={version:VERSION,close:closeModal,openAt:drawCrop};console.info(`FieldVerify ERS crop picker ${VERSION} loaded`);
})();