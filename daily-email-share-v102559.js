(()=>{
'use strict';
const VERSION='10.25.60-ios-share';
const EMAIL_KEY='fieldVerifyDailyReportEmail';
const NOTE_KEY='fieldVerifyDailyReportNote';

function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function say(msg){try{toast(msg)}catch{alert(msg)}}
function validEmailList(value){
  const list=String(value||'').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);
  if(!list.length)return[];
  return list.every(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))?list:[];
}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{return false}}
function savedEmails(){return validEmailList(localStorage.getItem(EMAIL_KEY)||'')}

function ensureStyles(){
  if(document.getElementById('fvDailyEmailStyle'))return;
  const s=document.createElement('style');s.id='fvDailyEmailStyle';s.textContent=`
  .fv-daily-email{margin-top:10px;padding:12px;border:2px solid #16803d;border-radius:12px;background:#f0fbf3}
  .fv-daily-email h3{margin:0 0 8px;font-size:16px;color:#12642f}
  .fv-daily-email label{display:block;font-size:12px;font-weight:900;color:#43515e;margin:7px 0 4px}
  .fv-daily-email input,.fv-daily-email textarea{width:100%;border:1px solid #b9c6d2;border-radius:9px;padding:10px;background:#fff;color:#16202a}
  .fv-daily-email textarea{min-height:70px;resize:vertical}
  .fv-daily-email .fv-email-help{font-size:11px;line-height:1.35;color:#5d6975;margin:7px 0}
  .fv-daily-email button{width:100%;padding:14px;margin-top:8px;background:#16803d;color:#fff;border:0;border-radius:10px;font-weight:900;font-size:16px}
  `;document.head.appendChild(s);
}

function cardHtml(){
  const saved=localStorage.getItem(EMAIL_KEY)||'';
  const note=localStorage.getItem(NOTE_KEY)||'Attached is today’s FieldVerify inspection report with today’s inspection information and pictures.';
  return `<div class="fv-daily-email" id="fvDailyEmailBox">
    <h3>Email Today’s Inspection Report</h3>
    <label for="fvDailyEmailTo">Send to</label>
    <input id="fvDailyEmailTo" type="email" inputmode="email" autocomplete="email" multiple placeholder="name@company.com" value="${esc(saved)}">
    <label for="fvDailyEmailNote">Email message</label>
    <textarea id="fvDailyEmailNote">${esc(note)}</textarea>
    <div class="fv-email-help">Tap the green button to build the PDF. When the PDF is ready, tap <b>Share PDF Now</b>, choose Mail or Gmail, and paste the copied recipient into the To field. This two-step share keeps the PDF and pictures attached on iPhone/iPad.</div>
    <button id="fvDailyEmailSend" type="button">BUILD EMAIL PDF</button>
  </div>`;
}

function install(){
  ensureStyles();
  const reportBtn=document.getElementById('dailyReportBtn');
  if(!reportBtn||document.getElementById('fvDailyEmailBox'))return;
  reportBtn.insertAdjacentHTML('afterend',cardHtml());
  const to=document.getElementById('fvDailyEmailTo');
  const note=document.getElementById('fvDailyEmailNote');
  if(to)to.addEventListener('change',()=>localStorage.setItem(EMAIL_KEY,to.value.trim()));
  if(note)note.addEventListener('change',()=>localStorage.setItem(NOTE_KEY,note.value));
}

function shareReadyMessage(label,emails){
  const el=document.getElementById('shareReadyText');
  if(!el)return;
  const recipient=emails.length?` Recipient copied: ${emails.join(', ')}.`:'';
  el.textContent=`${label} is ready.${recipient} Tap Share PDF Now, choose Mail or Gmail, then paste the recipient into the To field.`;
}

async function buildOfficePdf(reason,items,label,emails=[]){
  if(typeof saveRestorablePdf!=='function')throw Error('PDF report builder is not available');
  if(!items?.length)throw Error('No inspection work was found to send');
  await saveRestorablePdf(reason,items,true);
  shareReadyMessage(label,emails);
  const ready=document.getElementById('shareReady');
  if(ready)ready.classList.remove('hidden');
}

async function handleDaily(send){
  const to=document.getElementById('fvDailyEmailTo');
  const note=document.getElementById('fvDailyEmailNote');
  const emails=validEmailList(to?.value||'');
  if(!emails.length){say('Enter a valid email address first');to?.focus();return}
  localStorage.setItem(EMAIL_KEY,emails.join(', '));
  if(note)localStorage.setItem(NOTE_KEY,note.value);
  const copied=await copyText(emails.join(', '));
  if(copied)say('Recipient copied. Building today’s PDF…');
  const old=send.textContent;send.disabled=true;send.textContent='BUILDING TODAY’S PDF…';
  try{
    const items=typeof dailyRecords==='function'?dailyRecords().slice().sort((a,b)=>Number(a.n)-Number(b.n)):[];
    await buildOfficePdf('Daily-Shift-Report',items,'Today’s inspection report',emails);
  }catch(err){console.warn('Daily email/share failed',err);say(`Daily report failed: ${err.message||err}`)}finally{send.disabled=false;send.textContent=old}
}

async function handleFieldLog(btn){
  const n=typeof targetNumber==='function'?targetNumber():null;
  if(!n){say('Select an inspection item first');return}
  const emails=savedEmails();
  if(emails.length)await copyText(emails.join(', '));
  const old=btn.textContent;btn.disabled=true;btn.textContent='BUILDING FIELD LOG PDF…';
  try{
    const r=typeof rec==='function'?rec(n):null;
    const label=typeof itemName==='function'?itemName(n,r):`Inspection ${n}`;
    await buildOfficePdf(`Field-Log-${label}`,[{n,r}],`${label} field log`,emails);
  }catch(err){console.warn('Field log share failed',err);say(`Field log failed: ${err.message||err}`)}finally{btn.disabled=false;btn.textContent=old}
}

document.addEventListener('click',e=>{
  const daily=e.target?.closest?.('#fvDailyEmailSend');
  if(daily){e.preventDefault();e.stopImmediatePropagation();handleDaily(daily);return}
  const field=e.target?.closest?.('#shareLogBtn');
  if(field){e.preventDefault();e.stopImmediatePropagation();handleFieldLog(field)}
},true);

const obs=new MutationObserver(()=>install());
obs.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,1000);
console.info(`FieldVerify ${VERSION} loaded`);
})();
