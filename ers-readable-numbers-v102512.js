(()=>{
'use strict';
const VERSION='10.25.13-readable-numbers-2';
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
#fvReadableNumbers .fv-num{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;min-width:48px;height:34px;padding:0 8px;border:3px solid #083a73;border-radius:999px;background:#fff;color:#102033;box-shadow:0 2px 10px #0009;font-size:16px;font-weight:900;line-height:28px;text-align:center;white-space:nowrap;touch-action:manipulation}
#fvReadableNumbers .fv-num:active,#fvReadableNumbers .fv-num.fv-selected{background:#083a73;color:#fff;border-color:#fff;z-index:4}
@media(max-width:760px){#fvReadableNumbers .fv-num{min-width:54px;height:38px;padding:0 9px;font-size:18px;line-height:32px;border-width:3px}}
`;
document.head.appendChild(s)}
function clear(){const l=document.getElementById('fvReadableNumbers');if(l)l.replaceChildren()}
function currentRow(){const sel=document.getElementById('drawingFilter');const id=sel?.value||'';if(!id)return null;return readMeta().find(x=>x.id===id)||null}
async function pdfSource(row){if(!row)return null;if(row.sourceId){const src=await getSetting(row.sourceId);return src?.blob?{blob:src.blob,page:Number(row.pageNumber)||1}:null}const item=await getSetting(row.id);return item?.blob?{blob:item.blob,page:Number(item.pageNumber||row.pageNumber)||1}:null}
function numberMatches(str){const s=String(str||'');const out=[];for(const m of s.matchAll(/\d{3}/g)){const n=Number(m[0]);if(n>=100&&n<=499)out.push({n,index:m.index||0,text:m[0]})}return out}
function selectNumber(n,button){try{document.querySelectorAll('#fvReadableNumbers .fv-selected').forEach(x=>x.classList.remove('fv-selected'));button?.classList.add('fv-selected');if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:String(n)};if(typeof persist==='function')persist()}if(typeof selected!=='undefined')selected=n;if(typeof showTarget==='function')showTarget();const q=document.getElementById('search');if(q)q.value=String(n);if(typeof toast==='function')toast(`${filter.value} ${n} selected — add photos just like a caisson`)}catch(err){console.warn('Readable number selection',err)}}
function addButton(layer,seen,n,xp,yp){if(!Number.isFinite(xp)||!Number.isFinite(yp)||xp<0||xp>100||yp<0||yp>100)return;if(seen.some(a=>a.n===n&&Math.abs(a.x-xp)<.45&&Math.abs(a.y-yp)<.45))return;seen.push({n,x:xp,y:yp});const b=document.createElement('button');b.type='button';b.className='fv-num';b.textContent=String(n);b.dataset.n=String(n);b.style.left=xp+'%';b.style.top=yp+'%';b.title=`${filter.value} ${n}`;b.setAttribute('aria-label',`${filter.value} ${n}`);b.onclick=e=>{e.preventDefault();e.stopPropagation();selectNumber(n,b)};layer.appendChild(b)}
async function render(){const token=++runToken;clear();if(!active())return;const row=currentRow();if(!row)return;try{const src=await pdfSource(row);if(!src?.blob)return;const pdfjs=await import('./pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./pdf.worker.min.mjs';const pdf=await pdfjs.getDocument({data:await src.blob.arrayBuffer()}).promise;if(token!==runToken)return;const page=await pdf.getPage(Math.max(1,Math.min(pdf.numPages,src.page)));const viewport=page.getViewport({scale:1});const text=await page.getTextContent();if(token!==runToken)return;const layer=ensureLayer(),seen=[];for(const item of text.items||[]){if(!item.transform)continue;const matches=numberMatches(item.str);if(!matches.length)continue;const tx=pdfjs.Util.transform(viewport.transform,item.transform);const baseX=tx[4],baseY=tx[5];const str=String(item.str||'');const itemWidth=Number(item.width)||0;const sx=Math.hypot(tx[0],tx[1])||1;const dx=tx[0]/sx,dy=tx[1]/sx;for(const m of matches){let offset=0;if(str.length>1&&itemWidth>0)offset=itemWidth*((m.index+1.5)/str.length);const x=baseX+dx*offset,y=baseY+dy*offset;addButton(layer,seen,m.n,x/viewport.width*100,y/viewport.height*100)}}try{page.cleanup?.()}catch{};if(typeof toast==='function')toast(seen.length?`${seen.length} readable ${filter.value} numbers loaded`:`No 3-digit ${filter.value} numbers found on this page`)}catch(err){console.warn('Readable ERS numbers unavailable',err);if(typeof toast==='function')toast('Readable ERS numbers could not be loaded on this page')}}
function schedule(){clearTimeout(timer);timer=setTimeout(render,220)}
ensureStyle();filter.addEventListener('change',schedule);document.addEventListener('change',e=>{if(e.target?.id==='drawingFilter')schedule()},true);new MutationObserver(schedule).observe(plan,{attributes:true,attributeFilter:['src']});document.addEventListener('click',e=>{if(e.target?.closest?.('.fv-page-card,.fvSafePageGrid,.fvSafePages'))setTimeout(schedule,450)},true);setTimeout(schedule,900);
window.FIELDVERIFY_READABLE_ERS_NUMBERS={version:VERSION,refresh:schedule};
console.info(`FieldVerify readable ERS numbers ${VERSION} loaded`);
})();
