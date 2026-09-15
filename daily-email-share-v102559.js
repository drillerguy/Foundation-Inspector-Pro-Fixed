(()=>{
'use strict';
const VERSION='10.25.59-daily-email';
const EMAIL_KEY='fieldVerifyDailyReportEmail';
const NOTE_KEY='fieldVerifyDailyReportNote';

function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function say(msg){try{toast(msg)}catch{alert(msg)}}
function projectName(){return document.getElementById('projectNameBadge')?.textContent?.trim()||'FieldVerify Project'}
function today(){return new Date().toLocaleDateString()}
function validEmailList(value){
  const list=String(value||'').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);
  if(!list.length)return[];
  return list.every(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))?list:[];
}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{return false}}

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
    <div class="fv-email-help">The daily PDF already includes today’s saved inspection information and today’s pictures. On iPhone/iPad, tap the green button, choose Mail or Gmail from the share sheet, then paste the copied recipient into the To field.</div>
    <button id="fvDailyEmailSend" type="button">EMAIL / SHARE TODAY’S REPORT</button>
  </div>`;
}

function install(){
  ensureStyles();
  const reportBtn=document.getElementById('dailyReportBtn');
  if(!reportBtn||document.getElementById('fvDailyEmailBox'))return;
  reportBtn.insertAdjacentHTML('afterend',cardHtml());
  const send=document.getElementById('fvDailyEmailSend');
  const to=document.getElementById('fvDailyEmailTo');
  const note=document.getElementById('fvDailyEmailNote');
  if(!send||!to||!note)return;
  to.addEventListener('change',()=>localStorage.setItem(EMAIL_KEY,to.value.trim()));
  note.addEventListener('change',()=>localStorage.setItem(NOTE_KEY,note.value));
  send.addEventListener('click',async()=>{
    const emails=validEmailList(to.value);
    if(!emails.length){say('Enter a valid email address first');to.focus();return}
    localStorage.setItem(EMAIL_KEY,emails.join(', '));
    localStorage.setItem(NOTE_KEY,note.value);
    send.disabled=true;const old=send.textContent;send.textContent='PREPARING TODAY’S REPORT…';
    const copied=await copyText(emails.join(', '));
    if(copied)say('Email address copied. Choose Mail or Gmail, then paste it into the To field.');
    try{
      if(window.FoundationInspectorV10?.createTodayPdf){
        await window.FoundationInspectorV10.createTodayPdf();
      }else{
        reportBtn.click();
      }
      if(typeof navigator.share!=='function'){
        const subject=`${projectName()} - Daily Inspection Report - ${today()}`;
        const body=`${note.value}\n\nThe daily report PDF was prepared by FieldVerify. If it downloaded to Files, attach that PDF to this email.`;
        location.href=`mailto:${encodeURIComponent(emails[0])}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    }catch(err){console.warn('Daily email/share failed',err);say(`Daily report failed: ${err.message||err}`)}finally{send.disabled=false;send.textContent=old}
  });
}

const obs=new MutationObserver(()=>install());
obs.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,1000);
console.info(`FieldVerify ${VERSION} loaded`);
})();
