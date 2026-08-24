/* FieldVerify Pro v10.24 - backup/restore destination chooser
   Keeps automatic hosted autosave, while manual Backup/Restore lets the user
   choose Hosting or Device. Device backup uses the native share/save sheet
   when available so iPhone/iPad users can choose Files location and rename it.
*/
(()=>{
'use strict';
const VERSION='10.24-backup-choice-1';
function say(s){try{toast(s)}catch{}}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function projectName(){try{return activeProject()?.name||'FieldVerify Project'}catch{return'FieldVerify Project'}}
function safeName(v){return String(v||'FieldVerify-Project').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'FieldVerify-Project'}
function modal(title,body){
 document.getElementById('fvBackupChoiceModal')?.remove();
 const d=document.createElement('div');d.id='fvBackupChoiceModal';d.style.cssText='position:fixed;inset:0;z-index:1200;background:#000a;padding:18px;overflow:auto';
 d.innerHTML=`<div style="max-width:520px;margin:8vh auto;background:#fff;color:#16202a;border-radius:18px;padding:18px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 style="margin:0">${esc(title)}</h2><button id="fvChoiceClose" style="padding:10px">Close</button></div><div style="margin-top:14px">${body}</div></div>`;
 document.body.appendChild(d);d.querySelector('#fvChoiceClose').onclick=()=>d.remove();return d;
}
function choiceButtons(kind){
 const isBackup=kind==='backup';
 const d=modal(isBackup?'Backup Project':'Restore Project',`
  <p style="margin:0 0 12px;color:#596775">Choose where you want to ${isBackup?'save the backup':'restore the project from'}.</p>
  <button id="fvChoiceHosting" style="display:block;width:100%;padding:16px;margin:8px 0;background:#083a73;color:#fff;border-radius:12px;font-size:17px;font-weight:900">${isBackup?'BACKUP TO HOSTING':'RESTORE FROM HOSTING'}</button>
  <button id="fvChoiceDevice" style="display:block;width:100%;padding:16px;margin:8px 0;background:#e7edf4;color:#16202a;border-radius:12px;font-size:17px;font-weight:900">${isBackup?'BACKUP TO DEVICE':'RESTORE FROM DEVICE'}</button>
  <div style="font-size:12px;color:#687480;margin-top:10px">${isBackup?'On iPhone/iPad, Backup to Device opens the normal share/save sheet so you can choose Save to Files, choose a folder, and change the filename before saving.':'Restore from Device opens the file picker so you can choose a FieldVerify backup saved on this phone, iCloud Drive, Files, or another available location.'}</div>`);
 d.querySelector('#fvChoiceHosting').onclick=()=>{d.remove();const h=window.FIELDVERIFY_HOSTED_BACKUP;if(!h)return say('Hosted backup service is not ready');isBackup?h.backup():h.restore()};
 d.querySelector('#fvChoiceDevice').onclick=()=>{d.remove();isBackup?deviceBackup():deviceRestore()};
}
async function deviceBackup(){
 try{
  if(typeof buildProjectBackup!=='function')throw Error('Device backup engine is not ready');
  say('Preparing complete device backup…');
  const built=await buildProjectBackup();
  const payload=built?.payload||built;
  if(!payload||typeof payload!=='object')throw Error('Could not build project backup');
  const filename=`FieldVerify-Pro-${safeName(projectName())}-Backup-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.json`;
  const file=new File([JSON.stringify(payload)],filename,{type:'application/json'});
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{await navigator.share({files:[file],title:`FieldVerify Pro - ${projectName()}`});say('Device backup ready');return}catch(err){if(err?.name==='AbortError'){say('Device backup canceled');return}}
  }
  if(typeof downloadFile==='function'){downloadFile(file);say('Backup saved to device downloads');return}
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000);say('Backup saved to device');
 }catch(e){say(`Device backup failed: ${e.message}`)}
}
function deviceRestore(){
 const input=document.getElementById('restoreInput');
 if(!input)return say('Device restore picker is not available');
 input.value='';input.click();
}
function bind(){
 const b=document.getElementById('backupBtn');if(b&&!b.dataset.choice){b.dataset.choice='1';b.textContent='BACKUP PROJECT';b.onclick=e=>{e.preventDefault();e.stopPropagation();choiceButtons('backup')}}
 const r=document.getElementById('restoreBtn');if(r&&!r.dataset.choice){r.dataset.choice='1';r.textContent='RESTORE PROJECT';r.onclick=e=>{e.preventDefault();e.stopPropagation();choiceButtons('restore')}}
}
try{backupProject=()=>choiceButtons('backup')}catch{}
const obs=new MutationObserver(()=>setTimeout(bind,0));obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(bind,1200);setTimeout(bind,50);
window.FIELDVERIFY_BACKUP_CHOOSER={version:VERSION,backupDevice:deviceBackup,restoreDevice:deviceRestore,openBackup:()=>choiceButtons('backup'),openRestore:()=>choiceButtons('restore')};
console.info(`FieldVerify backup chooser ${VERSION} loaded`);
})();
