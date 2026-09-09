(()=> {
'use strict';
const VERSION='10.25.51-ers-status-box-overlay';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
const META_KEY='fieldVerifyDrawingLibraryV1024';
let timer=null,runToken=0,walerStart=null;

function active(){return filter.value==='ERS'||filter.value==='Tieback'||filter.value==='Waler'}
function say(s){try{toast(s)}catch{}}
function readMeta(){try{const x=JSON.parse(localStorage.getItem(META_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function currentMeta(){const s=document.getElementById('drawingFilter'),id=s&&s.value;if(!id)return null;return readMeta().find(x=>String(x.id)===String(id))||null}
function dbReq(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function getSetting(id){if(!id||typeof openDB!=='function')return null;const db=await openDB(),tx=db.transaction('settings','readonly');const item=await dbReq(tx.objectStore('settings').get(id));await txDone(tx);return item||null}
async function resolvePdf(){
  const meta=currentMeta();if(!meta)return null;
  let item=await getSetting(meta.id);
  if(!item?.blob&&meta.sourceId)item=await getSetting(meta.sourceId);
  if(!item?.blob)return null;
  const isPdf=item.type==='application/pdf'||String(item.name||meta.name||'').toLowerCase().endsWith('.pdf');
  if(!isPdf)return null;
  return {blob:item.blob,page:Math.max(1,Number(meta.pageNumber||item.pageNumber||1)||1),meta,item};
}
function ensureStyle(){
  if(document.getElementById('fvErsStatusBoxStyle'))return;
  const s=document.createElement('style');s.id='fvErsStatusBoxStyle';s.textContent=`
#map.fv-ers-box-mode #pins .pin{display:none!important}
#fvErsStatusBoxes{position:absolute;inset:0;z-index:24;pointer-events:none;line-height:normal}
#fvErsStatusBoxes .fv-ers-hit{position:absolute;transform:translate(-50%,-50%);width:46px;height:38px;padding:0;border:0;background:transparent;pointer-events:auto;touch-action:manipulation}
#fvErsStatusBoxes .fv-ers-chip{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30px;height:18px;border-radius:3px;opacity:0;pointer-events:none;box-sizing:border-box}
#fvErsStatusBoxes .fv-ers-hit.started .fv-ers-chip{opacity:.55;background:#7b3fc6;border:2px solid #5a249f}
#fvErsStatusBoxes .fv-ers-hit.complete .fv-ers-chip{opacity:.58;background:#16803d;border:2px solid #0e5d2b}
#fvErsStatusBoxes .fv-ers-hit.ncr .fv-ers-chip{opacity:.58;background:#c32727;border:2px solid #8f1717}
#fvErsStatusBoxes .fv-ers-hit.pending .fv-ers-chip{opacity:.58;background:#ff9f0a;border:2px solid #b56600}
#fvErsStatusBoxes .fv-ers-hit.selected .fv-ers-chip{opacity:.28;background:#0a84ff;border:3px solid #0058a8;box-shadow:0 0 0 2px #fff}
#fvErsStatusBoxes .fv-ers-hit.waler-first .fv-ers-chip{opacity:.55;background:#ff9f0a;border:3px solid #7a4b00;box-shadow:0 0 0 2px #fff}
@media(max-width:760px){#fvErsStatusBoxes .fv-ers-hit{width:50px;height:42px}#fvErsStatusBoxes .fv-ers-chip{width:32px;height:19px}}
`;document.head.appendChild(s);
}
function ensureLayer(){let l=document.getElementById('fvErsStatusBoxes');if(l)return l;l=document.createElement('div');l.id='fvErsStatusBoxes';map.appendChild(l);return l}
function clear(){const l=document.getElementById('fvErsStatusBoxes');if(l)l.replaceChildren()}
function displayId(n){return `E-${n}`}
function recordType(r){try{return typeof itemType==='function'?itemType(r):String(r?.itemType||'Caisson')}catch{return String(r?.itemType||'Caisson')}}
function complete(r){const s=String(r?.status||'').toLowerCase();return !!(r?.workCompletedAt||r?.unloadTime||s==='complete'||s==='completed'||s.includes('final driven')||s.includes('tested'))}
function started(r){const s=String(r?.status||'').toLowerCase();return !!(r?.workStartedAt||r?.pickupTime||(Array.isArray(r?.photos)&&r.photos.length)||s==='started'||s.includes('drilled')||s.includes('regrout')||s.includes('waler installed')||s.includes('initial set')||s.includes('pre-drill'))}
function ncrState(r){return String(r?.ncrState||r?.inspection?.ncrState||'').toLowerCase()}
function walerRecordFor(n){
  try{
    for(const [key,r] of Object.entries(records||{})){
      if(recordType(r)!=='Waler')continue;
      const lo=Number(r.walerStart),hi=Number(r.walerEnd);
      if(Number.isFinite(lo)&&Number.isFinite(hi)&&n>=Math.min(lo,hi)&&n<=Math.max(lo,hi))return {key:Number(key),r};
      if(Array.isArray(r.coveredTies)&&r.coveredTies.map(Number).includes(n))return {key:Number(key),r};
    }
  }catch{}
  return null;
}
function stateFor(n){
  let r=null,key=n;
  if(filter.value==='Waler'){const hit=walerRecordFor(n);if(hit){r=hit.r;key=hit.key}}
  else{try{const candidate=records?.[n];if(candidate&&recordType(candidate)===filter.value)r=candidate}catch{}}
  const ns=ncrState(r);
  let state=ns==='open'?'ncr':(ns==='pending'?'pending':(complete(r)?'complete':(started(r)?'started':'')));
  let isSelected=false;try{isSelected=Number(selected)===Number(key)}catch{}
  return {state,isSelected};
}
function walerKey(a,b){const lo=Math.min(a,b),hi=Math.max(a,b);return 900000000+lo*1000+hi}
function chooseNumber(n){
  if(filter.value==='Waler'){
    if(walerStart==null){walerStart=n;say(`Waler start ${displayId(n)} selected. Tap the ending tie box.`);refreshStates();return}
    const first=walerStart;walerStart=null;const lo=Math.min(first,n),hi=Math.max(first,n);
    if(hi-lo>12){walerStart=first;say('A waler can span up to 12 tie numbers.');refreshStates();return}
    const key=walerKey(first,n),label=first===n?displayId(n):`${displayId(lo)}–${displayId(hi)}`;
    try{
      if(typeof records!=='undefined'&&typeof rec==='function'){records[key]={...rec(key),itemType:'Waler',itemLabel:label,walerStart:lo,walerEnd:hi,coveredTies:Array.from({length:hi-lo+1},(_,i)=>lo+i)};if(typeof persist==='function')persist()}
      if(typeof selected!=='undefined')selected=key;if(typeof nearest!=='undefined')nearest=null;
      const q=document.getElementById('search');if(q)q.value=label;if(typeof showTarget==='function')showTarget();say(`Waler ${label} selected`);
    }catch(e){console.warn('Waler box selection failed',e)}
    refreshStates();return;
  }
  try{
    const id=displayId(n);
    if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:id};if(typeof persist==='function')persist()}
    if(typeof selected!=='undefined')selected=n;if(typeof nearest!=='undefined')nearest=null;
    const q=document.getElementById('search');if(q)q.value=id;if(typeof showTarget==='function')showTarget();
    say(`${filter.value==='ERS'?'Sheet Number':'Tieback'} ${id} selected`);
  }catch(e){console.warn('ERS/Tieback box selection failed',e)}
  refreshStates();
}
function numberParts(str){
  const s=String(str||''),out=[];
  for(const m of s.matchAll(/\b(?:E\s*[-–—]?\s*)?(\d{3})\b/gi)){const n=Number(m[1]);if(n>=100&&n<=499)out.push({n,index:m.index||0,len:m[0].length,explicit:/E/i.test(m[0])})}
  for(const m of s.matchAll(/\d{6,}/g)){
    const raw=m[0];if(raw.length%3)continue;
    for(let i=0;i<raw.length;i+=3){const n=Number(raw.slice(i,i+3));if(n>=100&&n<=499)out.push({n,index:(m.index||0)+i,len:3,explicit:false})}
  }
  return out;
}
function pickTieRow(cands){
  const uniq=[];for(const c of cands){if(!uniq.some(x=>x.n===c.n&&Math.abs(x.x-c.x)<.5&&Math.abs(x.y-c.y)<.5))uniq.push(c)}
  const explicit=uniq.filter(x=>x.explicit);if(explicit.length>=3)return explicit;
  if(uniq.length<3)return uniq;
  const bins=new Map();
  for(const c of uniq){const b=Math.round(c.y/3);const a=bins.get(b)||[];a.push(c);bins.set(b,a)}
  let best=[];for(const a of bins.values())if(a.length>best.length)best=a;
  if(best.length<3)return uniq.filter(x=>x.y>45);
  const center=best.reduce((s,x)=>s+x.y,0)/best.length;
  const row=uniq.filter(x=>Math.abs(x.y-center)<=4.5);
  return row.length>=3?row:best;
}
async function extractPositions(){
  const src=await resolvePdf();if(!src)return[];
  if(typeof pdfInfo!=='function')return[];
  const pdf=await pdfInfo(src.blob),page=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,src.page))),vp=page.getViewport({scale:1}),text=await page.getTextContent();
  const out=[];
  for(const item of text.items||[]){
    if(!item?.transform)continue;const str=String(item.str||''),parts=numberParts(str);if(!parts.length)continue;
    const a=Number(item.transform[0])||1,b=Number(item.transform[1])||0,norm=Math.hypot(a,b)||1,ux=a/norm,uy=b/norm,w=Number(item.width)||0;
    for(const p of parts){
      const frac=str.length?Math.max(0,Math.min(1,(p.index+p.len/2)/str.length)):.5;
      const px=Number(item.transform[4])||0,py=Number(item.transform[5])||0;
      const tx=px+ux*w*frac,ty=py+uy*w*frac;
      const point=typeof vp.convertToViewportPoint==='function'?vp.convertToViewportPoint(tx,ty):[tx,vp.height-ty];
      const x=point[0]/vp.width*100,y=point[1]/vp.height*100;
      if(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=100&&y>=0&&y<=100)out.push({n:p.n,x,y,explicit:p.explicit});
    }
  }
  try{page.cleanup?.()}catch{}
  return pickTieRow(out).sort((a,b)=>a.x-b.x);
}
function refreshStates(){
  const layer=document.getElementById('fvErsStatusBoxes');if(!layer)return;
  layer.querySelectorAll('.fv-ers-hit').forEach(b=>{
    b.classList.remove('started','complete','ncr','pending','selected','waler-first');
    const n=Number(b.dataset.n),s=stateFor(n);if(s.state)b.classList.add(s.state);if(s.isSelected)b.classList.add('selected');if(filter.value==='Waler'&&walerStart===n)b.classList.add('waler-first');
  });
}
async function render(){
  const token=++runToken;clear();map.classList.toggle('fv-ers-box-mode',active());if(!active())return;
  try{
    const pts=await extractPositions();if(token!==runToken)return;
    const layer=ensureLayer();
    for(const p of pts){
      const b=document.createElement('button');b.type='button';b.className='fv-ers-hit';b.dataset.n=String(p.n);b.style.left=p.x+'%';b.style.top=p.y+'%';b.setAttribute('aria-label',`Select ${filter.value} ${displayId(p.n)}`);
      const chip=document.createElement('span');chip.className='fv-ers-chip';b.appendChild(chip);
      b.onclick=e=>{e.preventDefault();e.stopPropagation();chooseNumber(p.n)};layer.appendChild(b);
    }
    refreshStates();
  }catch(e){console.warn('ERS status box overlay',e)}
}
function schedule(ms=180){clearTimeout(timer);timer=setTimeout(render,ms)}

ensureStyle();map.classList.toggle('fv-ers-box-mode',active());
filter.addEventListener('change',()=>{walerStart=null;schedule(220)},true);
document.addEventListener('change',e=>{if(e.target?.id==='drawingFilter')schedule(350);if(e.target?.id==='cameraInput'||e.target?.id==='libraryInput')setTimeout(refreshStates,500)},true);
new MutationObserver(()=>schedule(300)).observe(plan,{attributes:true,attributeFilter:['src']});
document.addEventListener('click',e=>{if(e.target?.closest?.('.pickup,.unload,.photo,#cameraInput,#libraryInput'))setTimeout(refreshStates,500)},true);
setTimeout(()=>schedule(0),1200);
window.FIELDVERIFY_ERS_STATUS_BOXES={version:VERSION,refresh:schedule,refreshStates};
console.info(`FieldVerify ERS status boxes ${VERSION} loaded`);
})();