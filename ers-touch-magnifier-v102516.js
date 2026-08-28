(()=>{
'use strict';
const VERSION='10.25.26-virtual-ers-picker-2';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
if(!filter||!map)return;
const OLD_MARKER_KEY='fieldVerifyTouchMarkersV102516';
let down=null,lastTap=0;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function say(s){try{toast(s)}catch{}}
function ensureStyle(){
 if(document.getElementById('fvErsVirtualPickerStyle'))return;
 const s=document.createElement('style');s.id='fvErsVirtualPickerStyle';s.textContent=`
#map.fv-ers-picker-active,#map.fv-ers-picker-active img{touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#fvErsVirtualPicker{position:fixed;z-index:1850;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));max-width:560px;max-height:72vh;margin:auto;background:#fff;color:#16202a;border-radius:20px;padding:16px;box-shadow:0 10px 38px #000b;line-height:normal;display:flex;flex-direction:column}
#fvErsVirtualPicker h3{margin:0 0 5px;font-size:22px}#fvErsVirtualPicker p{margin:0 0 12px;color:#65717c;font-size:13px}
#fvErsVirtualPicker .fv-range-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
#fvErsVirtualPicker .fv-number-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;overflow:auto;-webkit-overflow-scrolling:touch;padding:2px 1px 6px}
#fvErsVirtualPicker button{touch-action:manipulation}
#fvErsVirtualPicker .fv-range,#fvErsVirtualPicker .fv-virtual-number{min-height:54px;border-radius:12px;background:#083a73;color:#fff;font-weight:900;padding:7px}
#fvErsVirtualPicker .fv-range{font-size:18px}.fv-virtual-number{font-size:20px}
#fvErsVirtualPicker .fv-nearby{background:#16803d!important}
#fvErsVirtualPicker .fv-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
#fvErsVirtualPicker .fv-back,#fvErsVirtualPicker .fv-close{min-height:46px;border-radius:12px;background:#e7edf4;color:#16202a;font-weight:900}
@media(max-width:420px){#fvErsVirtualPicker .fv-number-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#fvErsVirtualPicker .fv-range-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
 document.head.appendChild(s)
}
function closePicker(){const x=document.getElementById('fvErsVirtualPicker');if(x&&x.parentNode)x.parentNode.removeChild(x)}
function projectId(){try{return String(typeof activeProjectId!=='undefined'&&activeProjectId||'legacy')}catch{return'legacy'}}
function drawingId(){const f=document.getElementById('drawingFilter');const p=document.getElementById('planImage');return f&&f.value||p&&p.src||'drawing'}
function oldMarkers(){try{const all=JSON.parse(localStorage.getItem(OLD_MARKER_KEY)||'{}');const key=`${projectId()}|${filter.value}|${drawingId()}`;const arr=all&&all[key];return Array.isArray(arr)?arr:[]}catch{return[]}}
function mapPct(x,y){const r=map.getBoundingClientRect();if(!r.width||!r.height)return null;return{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100}}
function nearbyMarkers(clientX,clientY){const p=mapPct(clientX,clientY);if(!p)return[];const list=[];for(const m of oldMarkers()){const n=Number(m&&m.n),x=Number(m&&m.x),y=Number(m&&m.y);if(!Number.isInteger(n)||!Number.isFinite(x)||!Number.isFinite(y))continue;const dx=x-p.x,dy=y-p.y;list.push({n,d:Math.sqrt(dx*dx+dy*dy)})}list.sort((a,b)=>a.d-b.d);const out=[],seen={};for(const v of list){if(seen[v.n])continue;seen[v.n]=1;out.push(v.n);if(out.length>=12)break}return out}
function knownNumbers(){const out=[],seen={};try{if(typeof records==='object'&&records){for(const k in records){const n=Number(k),r=records[k];if(!Number.isInteger(n)||n<1||n>9999)continue;const t=r&&r.itemType||'Caisson';if(t!==filter.value)continue;if(!seen[n]){seen[n]=1;out.push(n)}}}}catch{}out.sort((a,b)=>a-b);return out}
function selectNumber(n){
 try{
  if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:String(n)};if(typeof persist==='function')persist()}
  if(typeof selected!=='undefined')selected=n;
  const q=document.getElementById('search');if(q)q.value=String(n);
  if(typeof showTarget==='function')showTarget();
  say(`${filter.value} ${n} selected`)
 }catch(e){console.warn('ERS virtual number select failed',e)}
}
function addNumberButton(grid,n,nearby){const b=document.createElement('button');b.type='button';b.className='fv-virtual-number'+(nearby?' fv-nearby':'');b.textContent=String(n);b.onclick=()=>{closePicker();selectNumber(n)};grid.appendChild(b)}
function showRange(c,start,end){
 const title=c.querySelector('h3'),desc=c.querySelector('p'),body=c.querySelector('.fv-picker-body');title.textContent=`${filter.value} ${start}–${end}`;desc.textContent='Tap the clean number that matches the drawing.';body.innerHTML='';const grid=document.createElement('div');grid.className='fv-number-grid';const known=new Set(knownNumbers());for(let n=start;n<=end;n++)addNumberButton(grid,n,known.has(n));body.appendChild(grid);const back=c.querySelector('.fv-back');back.style.display='block';back.onclick=()=>showHome(c,[])
}
function showHome(c,nearby){
 const title=c.querySelector('h3'),desc=c.querySelector('p'),body=c.querySelector('.fv-picker-body');title.textContent=`Choose ${filter.value} number`;desc.textContent=nearby.length?'Green numbers are saved near the spot you touched. Or choose a number range.':'Choose a number range, then tap the clean number.';body.innerHTML='';
 if(nearby.length){const g=document.createElement('div');g.className='fv-number-grid';for(const n of nearby)addNumberButton(g,n,true);body.appendChild(g);const label=document.createElement('p');label.textContent='All numbers';label.style.margin='12px 0 7px';label.style.fontWeight='900';body.appendChild(label)}
 const ranges=document.createElement('div');ranges.className='fv-range-grid';const known=knownNumbers();let max=499;if(known.length)max=Math.max(499,known[known.length-1]);max=Math.min(9999,max);for(let start=1;start<=max;start+=100){const end=Math.min(start+99,max),b=document.createElement('button');b.type='button';b.className='fv-range';b.textContent=`${start}–${end}`;b.onclick=()=>showRange(c,start,end);ranges.appendChild(b)}body.appendChild(ranges);const back=c.querySelector('.fv-back');back.style.display='none'
}
function showPicker(clientX,clientY){
 closePicker();const c=document.createElement('div');c.id='fvErsVirtualPicker';c.setAttribute('role','dialog');c.setAttribute('aria-label',`Choose ${filter.value} number`);c.innerHTML='<h3></h3><p></p><div class="fv-picker-body"></div><div class="fv-toolbar"><button type="button" class="fv-back">Back</button><button type="button" class="fv-close">Cancel</button></div>';c.querySelector('.fv-close').onclick=closePicker;document.body.appendChild(c);showHome(c,nearbyMarkers(clientX,clientY))
}
function syncMode(){if(active())map.classList.add('fv-ers-picker-active');else{map.classList.remove('fv-ers-picker-active');closePicker()}}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('button,input,select,textarea')))return;down={x:e.clientX,y:e.clientY,moved:false}},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.sqrt(dx*dx+dy*dy)>12)down.moved=true},{passive:true});
map.addEventListener('pointercancel',()=>{down=null},{passive:true});
map.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(!active()||d.moved)return;const now=Date.now();if(now-lastTap<300){lastTap=0;return}lastTap=now;showPicker(e.clientX,e.clientY)},{passive:true});
map.addEventListener('dblclick',e=>{if(active()){e.preventDefault();e.stopImmediatePropagation()}},true);
filter.addEventListener('change',syncMode,true);document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter')closePicker()},true);
ensureStyle();syncMode();
window.FIELDVERIFY_ERS_TOUCH={version:VERSION,close:closePicker};
console.info(`FieldVerify ERS virtual picker ${VERSION} loaded`);
})();