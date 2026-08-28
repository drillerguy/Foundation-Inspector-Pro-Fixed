(()=>{
'use strict';
const VERSION='10.25.25-virtual-ers-picker-1';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
if(!filter||!map)return;
let down=null;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function say(s){try{toast(s)}catch{}}
function ensureStyle(){
 if(document.getElementById('fvErsVirtualPickerStyle'))return;
 const s=document.createElement('style');s.id='fvErsVirtualPickerStyle';s.textContent=`
#map.fv-ers-picker-active{touch-action:manipulation}
#map.fv-ers-picker-active #fvReadableNumbers .fv-num{opacity:0!important;pointer-events:none!important}
#fvErsVirtualPicker{position:fixed;z-index:1850;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));max-width:520px;margin:auto;background:#fff;color:#16202a;border-radius:20px;padding:16px;box-shadow:0 10px 38px #000b;line-height:normal}
#fvErsVirtualPicker h3{margin:0 0 5px;font-size:22px}#fvErsVirtualPicker p{margin:0 0 12px;color:#65717c;font-size:13px}
#fvErsVirtualPicker .fv-number-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
#fvErsVirtualPicker .fv-virtual-number{min-height:58px;border-radius:13px;background:#083a73;color:#fff;font-size:23px;font-weight:900;padding:8px;touch-action:manipulation}
#fvErsVirtualPicker .fv-virtual-number:active{background:#16803d}
#fvErsVirtualPicker .fv-close{width:100%;min-height:46px;margin-top:10px;border-radius:12px;background:#e7edf4;color:#16202a;font-weight:900}
@media(max-width:380px){#fvErsVirtualPicker .fv-number-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
 document.head.appendChild(s)
}
function closePicker(){const x=document.getElementById('fvErsVirtualPicker');if(x&&x.parentNode)x.parentNode.removeChild(x)}
function sourceButtons(){return Array.from(document.querySelectorAll('#fvReadableNumbers .fv-num')).filter(b=>/^\d{1,4}$/.test(String(b.dataset.n||b.textContent||'').trim()))}
function pctPoint(clientX,clientY){const r=map.getBoundingClientRect();if(!r.width||!r.height)return null;return{x:(clientX-r.left)/r.width*100,y:(clientY-r.top)/r.height*100}}
function nearby(clientX,clientY){
 const p=pctPoint(clientX,clientY);if(!p)return[];
 const all=sourceButtons().map(b=>{const x=parseFloat(b.style.left),y=parseFloat(b.style.top);if(!Number.isFinite(x)||!Number.isFinite(y))return null;const dx=x-p.x,dy=y-p.y;return{b,n:Number(b.dataset.n||b.textContent),d:Math.sqrt(dx*dx+dy*dy)}}).filter(Boolean).sort((a,b)=>a.d-b.d);
 const close=all.filter(x=>x.d<=7.5);
 const base=close.length?close:all.slice(0,6),seen=new Set(),out=[];
 for(const x of base){if(!Number.isInteger(x.n)||seen.has(x.n))continue;seen.add(x.n);out.push(x);if(out.length>=6)break}
 return out;
}
function showPicker(clientX,clientY){
 closePicker();const choices=nearby(clientX,clientY);
 if(!choices.length){say(`${filter.value} numbers are still loading for this drawing`);try{window.FIELDVERIFY_READABLE_ERS_NUMBERS&&window.FIELDVERIFY_READABLE_ERS_NUMBERS.refresh&&window.FIELDVERIFY_READABLE_ERS_NUMBERS.refresh()}catch{};return}
 const c=document.createElement('div');c.id='fvErsVirtualPicker';c.setAttribute('role','dialog');c.setAttribute('aria-label',`Choose ${filter.value} number`);
 const h=document.createElement('h3');h.textContent=`Choose ${filter.value} number`;c.appendChild(h);
 const p=document.createElement('p');p.textContent='Clean numbers nearest the spot you touched. Tap the correct one.';c.appendChild(p);
 const grid=document.createElement('div');grid.className='fv-number-grid';
 for(const x of choices){const b=document.createElement('button');b.type='button';b.className='fv-virtual-number';b.textContent=String(x.n);b.onclick=()=>{closePicker();x.b.click()};grid.appendChild(b)}
 c.appendChild(grid);const close=document.createElement('button');close.type='button';close.className='fv-close';close.textContent='Cancel';close.onclick=closePicker;c.appendChild(close);document.body.appendChild(c)
}
function syncMode(){if(active())map.classList.add('fv-ers-picker-active');else{map.classList.remove('fv-ers-picker-active');closePicker()}}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('button,input,select,textarea')))return;down={x:e.clientX,y:e.clientY,moved:false}},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.sqrt(dx*dx+dy*dy)>11)down.moved=true},{passive:true});
map.addEventListener('pointercancel',()=>{down=null},{passive:true});
map.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(!active()||d.moved)return;showPicker(e.clientX,e.clientY)},{passive:true});
filter.addEventListener('change',syncMode,true);document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter')closePicker()},true);
ensureStyle();syncMode();
window.FIELDVERIFY_ERS_TOUCH={version:VERSION,close:closePicker};
console.info(`FieldVerify ERS virtual number picker ${VERSION} loaded`);
})();