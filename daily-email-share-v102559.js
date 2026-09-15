(()=>{
'use strict';
const VERSION='10.25.61-ios-light-share';
const EMAIL_KEY='fieldVerifyDailyReportEmail';
const NOTE_KEY='fieldVerifyDailyReportNote';
let busy=false;

function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function say(msg){try{toast(msg)}catch{alert(msg)}}
function validEmailList(value){const list=String(value||'').split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);return list.length&&list.every(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))?list:[]}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{return false}}
function savedEmails(){return validEmailList(localStorage.getItem(EMAIL_KEY)||'')}
function localDay(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function todayKey(){return localDay(new Date())}
function pdfText(v){return String(v??'').replace(/[—–]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\x20-\x7e\xa0-\xff]/g,'?')}
function lines(text,max=82){const words=pdfText(text||'-').replace(/\s+/g,' ').trim().split(' '),out=[];let line='';for(const w of words){if((line+' '+w).trim().length>max&&line){out.push(line);line=w}else line=(line+' '+w).trim()}if(line)out.push(line);return out.length?out:['-']}
function projectName(){try{return activeProject()?.name||'FieldVerify Project'}catch{return'FieldVerify Project'}}
function safeName(v){return String(v||'Report').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'Report'}

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
  `;document.head.appendChild(s)
}
function cardHtml(){
  const saved=localStorage.getItem(EMAIL_KEY)||'';
  const note=localStorage.getItem(NOTE_KEY)||'Attached is today’s FieldVerify inspection report with today’s inspection information and pictures.';
  return `<div class="fv-daily-email" id="fvDailyEmailBox"><h3>Email Today’s Inspection Report</h3><label for="fvDailyEmailTo">Send to</label><input id="fvDailyEmailTo" type="email" inputmode="email" autocomplete="email" multiple placeholder="name@company.com" value="${esc(saved)}"><label for="fvDailyEmailNote">Email message</label><textarea id="fvDailyEmailNote">${esc(note)}</textarea><div class="fv-email-help">Build the PDF first. When it is ready, tap <b>Share PDF Now</b>, choose Mail or Gmail, and paste the copied recipient into the To field.</div><button id="fvDailyEmailSend" type="button">BUILD EMAIL PDF</button></div>`
}
function install(){ensureStyles();const reportBtn=document.getElementById('dailyReportBtn');if(!reportBtn||document.getElementById('fvDailyEmailBox'))return;reportBtn.insertAdjacentHTML('afterend',cardHtml());const to=document.getElementById('fvDailyEmailTo'),note=document.getElementById('fvDailyEmailNote');to?.addEventListener('change',()=>localStorage.setItem(EMAIL_KEY,to.value.trim()));note?.addEventListener('change',()=>localStorage.setItem(NOTE_KEY,note.value))}

async function photoJpeg(blob,maxDim=1100,quality=.58){
  const url=URL.createObjectURL(blob);
  try{
    const img=await new Promise((res,rej)=>{const x=new Image();x.onload=()=>res(x);x.onerror=()=>rej(Error('Photo could not be opened'));x.src=url});
    const scale=Math.min(1,maxDim/Math.max(img.naturalWidth||1,img.naturalHeight||1));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const jpg=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Photo conversion failed')),'image/jpeg',quality));
    canvas.width=1;canvas.height=1;return jpg;
  }finally{URL.revokeObjectURL(url)}
}

async function buildLightPdf(items,{daily=false,title='Field Log'}={}){
  if(!window.PDFLib)throw Error('PDF builder is not available');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib,pdf=await PDFDocument.create();
  const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const addTextPage=(heading,r)=>{
    let page=pdf.addPage([612,792]),y=744;
    const put=(text,size=10,strong=false)=>{for(const line of lines(text,strong?67:82)){if(y<54){page=pdf.addPage([612,792]);y=744}page.drawText(pdfText(line),{x:42,y,size,font:strong?bold:font,color:rgb(.04,.12,.2)});y-=size+5}};
    put(title,20,true);put(projectName(),14,true);put(new Date().toLocaleString(),9);put(heading,16,true);put(`Status: ${r?.status||'No information'}`);put(`Type: ${typeof itemType==='function'?itemType(r):r?.itemType||'Inspection'}`);put(`GPS: ${Number.isFinite(Number(r?.lat))&&Number.isFinite(Number(r?.lon))?`${r.lat}, ${r.lon}`:'Not saved'}`);put(`Started: ${r?.pickupTime?new Date(r.pickupTime).toLocaleString():'-'}`);put(`Completed: ${r?.unloadTime?new Date(r.unloadTime).toLocaleString():'-'}`);put(`Inspection: ${r?.inspection?.overall||'Not set'}`);put('Notes',12,true);put(r?.notes||'No field notes');return page
  };
  for(const item of items){
    const n=item.n,r=item.r||{},heading=typeof itemName==='function'?itemName(n,r):`Inspection ${n}`;addTextPage(heading,r);
    let photos=[];try{photos=await getPhotos(n)}catch{}
    if(daily)photos=photos.filter(p=>localDay(p?.date||p?.capturedAt)===todayKey());
    for(const p of photos){
      try{
        const jpg=await photoJpeg(p.blob),image=await pdf.embedJpg(await jpg.arrayBuffer()),dims=image.scale(Math.min(520/image.width,620/image.height,1)),page=pdf.addPage([612,792]);
        page.drawText(pdfText(`${heading} - ${p.name||'Photo'}${p.date?` - ${new Date(p.date).toLocaleString()}`:''}`),{x:42,y:748,size:10,font:bold,color:rgb(.04,.12,.2)});
        page.drawImage(image,{x:(612-dims.width)/2,y:92+(620-dims.height)/2,width:dims.width,height:dims.height});
      }catch(err){console.warn('Light report photo skipped',err)}
    }
  }
  const bytes=await pdf.save();
  return new File([bytes],`${safeName(projectName())}-${safeName(title)}-${new Date().toISOString().slice(0,10)}.pdf`,{type:'application/pdf',lastModified:Date.now()})
}

function exposeShare(file,label,emails=[]){
  pendingOfficeFile=file;
  const ready=document.getElementById('shareReady'),text=document.getElementById('shareReadyText');
  if(text)text.textContent=`${label} is ready (${(file.size/1048576).toFixed(1)} MB).${emails.length?` Recipient copied: ${emails.join(', ')}.`:''} Tap Share PDF Now and choose Mail or Gmail.`;
  ready?.classList.remove('hidden');
}

async function handleFieldLog(btn){
  if(busy)return;const n=typeof targetNumber==='function'?targetNumber():null;if(!n){say('Select an inspection item first');return}
  busy=true;const old=btn.textContent;btn.disabled=true;btn.textContent='BUILDING FIELD LOG PDF…';
  try{const r=typeof rec==='function'?rec(n):{},label=typeof itemName==='function'?itemName(n,r):`Inspection ${n}`,emails=savedEmails();if(emails.length)await copyText(emails.join(', '));const file=await buildLightPdf([{n,r}],{daily:false,title:`${label} Field Log`});exposeShare(file,`${label} field log`,emails);say('Field log PDF ready - tap Share PDF Now')}
  catch(err){console.warn('Field log share failed',err);say(`Field log failed: ${err.message||err}`)}finally{busy=false;btn.disabled=false;btn.textContent=old}
}
async function handleDaily(btn){
  if(busy)return;const to=document.getElementById('fvDailyEmailTo'),note=document.getElementById('fvDailyEmailNote'),emails=validEmailList(to?.value||'');if(!emails.length){say('Enter a valid email address first');to?.focus();return}
  localStorage.setItem(EMAIL_KEY,emails.join(', '));if(note)localStorage.setItem(NOTE_KEY,note.value);await copyText(emails.join(', '));
  const items=typeof dailyRecords==='function'?dailyRecords().slice().sort((a,b)=>Number(a.n)-Number(b.n)):[];if(!items.length){say('No work has been recorded today');return}
  busy=true;const old=btn.textContent;btn.disabled=true;btn.textContent='BUILDING TODAY’S PDF…';
  try{const file=await buildLightPdf(items,{daily:true,title:'Daily Inspection Report'});exposeShare(file,'Today’s inspection report',emails);say('Daily PDF ready - tap Share PDF Now')}
  catch(err){console.warn('Daily email/share failed',err);say(`Daily report failed: ${err.message||err}`)}finally{busy=false;btn.disabled=false;btn.textContent=old}
}

document.addEventListener('click',e=>{
  const field=e.target?.closest?.('#shareLogBtn');if(field){e.preventDefault();e.stopImmediatePropagation();handleFieldLog(field);return}
  const daily=e.target?.closest?.('#fvDailyEmailSend');if(daily){e.preventDefault();e.stopImmediatePropagation();handleDaily(daily)}
},true);

const obs=new MutationObserver(install);obs.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();setTimeout(install,1000);
console.info(`FieldVerify ${VERSION} loaded`);
})();