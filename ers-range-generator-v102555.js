(()=>{
'use strict';
const VERSION='10.25.55-ers-range-generator';
const STORE='fieldVerifyManualErsRowsV102555';
const filter=document.getElementById('itemFilter');
if(!filter)return;
function say(s){try{toast(s)}catch{}}
function cleanNumber(v){const m=String(v||'').match(/\d{1,4}/);return m?Number(m[0]):NaN}
function display(n){return `E-${n}`}
function manualKey(){const project=typeof activeProjectId!=='undefined'?String(activeProjectId||'legacy'):'legacy';const drawing=document.getElementById('drawingFilter')?.value||'default';return `${project}|${filter.value}|${drawing}`}
function readSaved(){try{const all=JSON.parse(localStorage.getItem(STORE)||'{}');return all&&typeof all==='object'?all[manualKey()]||null:null}catch{return null}}
function saveRange(first,last){try{const all=JSON.parse(localStorage.getItem(STORE)||'{}')||{};all[manualKey()]={first,last,updated:new Date().toISOString()};localStorage.setItem(STORE,JSON.stringify(all))}catch{}}
function makeSequence(first,last){const step=last>=first?1:-1,count=Math.abs(last-first)+1;if(count>60)return null;return Array.from({length:count},(_,i)=>first+i*step)}
function selectNumber(n){
  try{
    if(filter.value==='Waler'){
      const q=document.getElementById('search');if(q)q.value=display(n);say(`${display(n)} ready — tap it in Waler mode to use as an endpoint`);return;
    }
    const id=display(n);
    if(typeof records!=='undefined'&&typeof rec==='function'){
      records[n]={...rec(n),itemType:filter.value,itemLabel:id};
      if(typeof persist==='function')persist();
    }
    if(typeof selected!=='undefined')selected=n;
    if(typeof nearest!=='undefined')nearest=null;
    const q=document.getElementById('search');if(q)q.value=id;
    if(typeof showTarget==='function')showTarget();
    window.FIELDVERIFY_ERS_PICKER_FIX?.close?.();
    say(`${filter.value==='ERS'?'Sheet Number':'Tieback'} ${id} selected`);
  }catch(e){console.warn('Manual ERS row select',e)}
}
function renderSequence(overlay,seq){
  if(!overlay||!seq?.length)return;
  overlay.replaceChildren();
  const rows=seq.length>16?2:1;
  seq.forEach((n,i)=>{
    const b=document.createElement('button');b.type='button';b.className='fv-page-virtual';b.textContent=display(n);b.dataset.manualRange='1';
    const row=rows===2?i%2:0;const col=rows===2?Math.floor(i/2):i;const cols=Math.ceil(seq.length/rows);
    const x=cols===1?50:6+88*(col/(cols-1));const y=rows===1?78:(row===0?71:84);
    b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label',`Select ${filter.value} ${display(n)}`);b.onclick=e=>{e.preventDefault();e.stopPropagation();selectNumber(n)};overlay.appendChild(b);
  });
  const note=document.createElement('div');note.id='fvErsCropMessage';note.textContent=`Generated ${seq.length} numbers from ${display(seq[0])} through ${display(seq[seq.length-1])}. Tap any box to select it.`;overlay.appendChild(note);
}
function generate(modal){
  const first=cleanNumber(modal.querySelector('#fvRangeFirst')?.value),last=cleanNumber(modal.querySelector('#fvRangeLast')?.value);
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<1){say('Enter the first and last number in the row');return}
  const seq=makeSequence(first,last);if(!seq){say('That row is too large. Use 60 numbers or fewer.');return}
  saveRange(first,last);renderSequence(modal.querySelector('#fvErsCropOverlay'),seq);
}
function install(modal){
  if(!modal||modal.dataset.fvRangeReady==='1')return;modal.dataset.fvRangeReady='1';
  let manual=modal.querySelector('#fvErsCropManual');
  if(!manual){manual=document.createElement('div');manual.id='fvErsCropManual';const close=modal.querySelector('#fvErsCropClose');close?.before(manual)}
  manual.innerHTML='<input id="fvRangeFirst" inputmode="numeric" placeholder="First # e.g. 244"><input id="fvRangeLast" inputmode="numeric" placeholder="Last # e.g. 233"><button id="fvGenerateRow" type="button">Generate Row</button>';
  manual.style.display='grid';manual.style.gridTemplateColumns='1fr 1fr';manual.style.gap='7px';manual.style.marginTop='9px';
  const btn=manual.querySelector('#fvGenerateRow');btn.style.gridColumn='1 / -1';btn.textContent='GENERATE ALL NUMBERS IN THIS ROW';
  const saved=readSaved();if(saved){manual.querySelector('#fvRangeFirst').value=saved.first||'';manual.querySelector('#fvRangeLast').value=saved.last||''}
  btn.onclick=()=>generate(modal);
  manual.querySelectorAll('input').forEach(inp=>inp.addEventListener('keydown',e=>{if(e.key==='Enter')generate(modal)}));
}
const obs=new MutationObserver(()=>{const modal=document.getElementById('fvErsCropModal');if(modal)install(modal)});obs.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>install(document.getElementById('fvErsCropModal')),300);
window.FIELDVERIFY_ERS_RANGE_GENERATOR={version:VERSION};
console.info(`FieldVerify ERS range generator ${VERSION} loaded`);
})();