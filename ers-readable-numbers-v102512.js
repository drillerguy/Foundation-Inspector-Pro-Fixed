(()=>{
'use strict';
const VERSION='10.25.14-readable-numbers-3';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan){console.warn('Readable ERS numbers: required controls missing');return;}
const META_KEY='fieldVerifyDrawingLibraryV1024';
let timer=null,runToken=0;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function readMeta(){try{const x=JSON.parse(localStorage.getItem(META_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function dbDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function getSetting(id){const db=await openDB(),tx=db.transaction('settings','readonly'),q=tx.objectStore('settings').get(id);const v=await new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});await dbDone(tx);return v}
function ensureLayer(){let l=document.getElementById('fvReadableNumbers');if(l)return l;l=document.createElement('div');l.id='fvReadableNumbers';l.setAttribute('aria-label','Readable ERS and tieback numbers');map.appendChild(l);return l}
function ensureStyle(){if(document.getElementById('fvReadableNumbersStyle'))return;const s=document.createElement('style');s.id='fvReadableNumbersStyle';s.textContent=`
#fvReadableNumbers{position:absolute;inset:0;z-index:21;pointer-events:none;line-height:normal}
#fvReadableNumbers .fv-num{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;min-width:52px;height:38px;padding:0 9px;border:3px solid #083a73;border-radius:999px;background:#fff;color:#102033;box-shadow:0 2px 10px #0009;font-size:18px;font-weight:900;line-height:32px;text-align:center;white-space:nowrap;touch-action:manipulation}
#fvReadableNumbers .fv-num:active,#fvReadableNumbers .fv-num.fv-selected{background:#083a73;color:#fff;border-color:#fff;z-index:4}
@media(max-width:760px){#fvReadableNumbers .fv-num{min-width:58px;height:42px;padding:0 10px;font-size:20px;line-height:36px;border-width:3px}}
`;
document.head.appendChild(s)}
function clear(){const l=document.getElementById('fvReadableNumbers');if(l)l.replaceChildren()}
function currentRow(){const sel=document.getElementById('drawingFilter');const id=sel?.value||'';if(!id)return null;return readMeta().find(x=>x.id===id)||null}
async function pdfSource(row){
 if(!row)return null;
 if(row.sourceId){const src=await getSetting(row.sourceId);if(src?.blob)return{blob:src.blob,page:Number(row.pageNumber)||1}}
 const item=await getSetting(row.id);if(item?.blob)return{blob:item.blob,page:Number(item.pageNumber||row.pageNumber)||1};
 return null;
}
async function openPdf(blob){
 if(typeof pdfInfo==='function')return pdfInfo(blob);
 const pdfjs=await import('./pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='./pdf.worker.min.mjs';
 return pdfjs.getDocument({data:await blob.arrayBuffer()}).promise;
}
function numberMatches(str){const out=[];const s=String(str||'');const re=/\d{3}/g;let m;while((m=re.exec(s))){const n=Number(m[0]);if(n>=100&&n<=499)out.push({n,index:m.index,text:m[0]})}return out}
function selectNumber(n,button){try{
 document.querySelectorAll('#fvReadableNumbers .fv-selected').forEach(x=>x.classList.remove('fv-selected'));button?.classList.add('fv-selected');
 if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:String(n)};if(typeof persist==='function')persist()}
 if(typeof selected!=='undefined')selected=n;
 if(typeof showTarget==='function')showTarget();
 const q=document.getElementById('search');if(q)q.value=String(n);
 if(typeof toast==='function')toast(`${filter.value} ${n} selected — photo can be added to this item`);
}catch(err){console.warn('Readable number selection',err)}}
function addButton(layer,seen,n,xp,yp){
 if(!Number.isFinite(xp)||!Number.isFinite(yp)||xp<0||xp>100||yp<0||yp>100)return;
 if(seen.some(a=>a.n===n&&Math.abs(a.x-xp)<.45&&Math.abs(a.y-yp)<.45))return;
 seen.push({n,x:xp,y:yp});
 const b=document.createElement('button');b.type='button';b.className='fv-num';b.textContent=String(n);b.dataset.n=String(n);b.style.left=xp+'%';b.style.top=yp+'%';b.title=`${filter.value} ${n}`;b.setAttribute('aria-label',`${filter.value} ${n}`);b.onclick=e=>{e.preventDefault();e.stopPropagation();selectNumber(n,b)};layer.appendChild(b);
}
async function render(){
 const token=++runToken;clear();if(!active())return;
 const row=currentRow();if(!row){if(typeof toast==='function')toast('Open an ERS drawing page first');return}
 try{
  const src=await pdfSource(row);if(!src?.blob)throw Error('PDF source is not stored for this drawing page');
  const pdf=await openPdf(src.blob);if(token!==runToken)return;
  const page=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,src.page)));
  const viewport=page.getViewport({scale:1});
  const text=await page.getTextContent();if(token!==runToken)return;
  const layer=ensureLayer(),seen=[];
  for(const item of text.items||[]){
   if(!item.transform)continue;
   const matches=numberMatches(item.str);if(!matches.length)continue;
   const a=Number(item.transform[0])||1,b=Number(item.transform[1])||0;
   const mag=Math.hypot(a,b)||1,ux=a/mag,uy=b/mag;
   const baseX=Number(item.transform[4])||0,baseY=Number(item.transform[5])||0;
   const width=Number(item.width)||0,str=String(item.str||'');
   for(const m of matches){
    const frac=str.length?Math.min(1,Math.max(0,(m.index+1.5)/str.length)):.5;
    const px=baseX+ux*width*frac,py=baseY+uy*width*frac;
    const vp=viewport.convertToViewportPoint(px,py);
    addButton(layer,seen,m.n,vp[0]/viewport.width*100,vp[1]/viewport.height*100);
   }
  }
  try{page.cleanup?.()}catch{}
  if(typeof toast==='function')toast(seen.length?`${seen.length} readable ${filter.value} numbers loaded`:`No 3-digit ${filter.value} numbers found on this page`);
 }catch(err){console.warn('Readable ERS numbers unavailable',err);if(typeof toast==='function')toast(`ERS numbers could not load: ${err.message||err}`)}
}
function schedule(){clearTimeout(timer);timer=setTimeout(render,250)}
ensureStyle();
filter.addEventListener('change',schedule);
document.addEventListener('change',e=>{if(e.target?.id==='drawingFilter')schedule()},true);
new MutationObserver(schedule).observe(plan,{attributes:true,attributeFilter:['src']});
document.addEventListener('click',e=>{if(e.target?.closest?.('.fv-page-card,.fvSafePageGrid,.fvSafePages'))setTimeout(schedule,600)},true);
setTimeout(schedule,1000);
window.FIELDVERIFY_READABLE_ERS_NUMBERS={version:VERSION,refresh:schedule};
console.info(`FieldVerify readable ERS numbers ${VERSION} loaded`);
})();
