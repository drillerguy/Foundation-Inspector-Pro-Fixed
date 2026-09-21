/* FieldVerify Pro v10.24 - backup/restore destination chooser
   Keeps automatic hosted autosave, while manual Backup/Restore lets the user
   choose Hosting or Device. Device backup uses the native share/save sheet
   when available so iPhone/iPad users can choose Files location and rename it.
*/
(()=>{
'use strict';
const VERSION='10.25.89-backup-choice';
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
function isRecoveryMaster(){try{return !!activeProject()?.recoveryMaster}catch{return false}}
async function hostedAction(isBackup){
 try{
  if(!window.FIELDVERIFY_HOSTED_BACKUP&&typeof loadScript==='function')await loadScript('hosted-backup-v1024.js');
  const h=window.FIELDVERIFY_HOSTED_BACKUP;
  if(!h)throw Error('Hosted backup service did not load');
  return isBackup?h.backup():h.restore();
 }catch(e){say('Cloud backup service failed: '+(e?.message||e))}
}
function choiceButtons(kind){
 const isBackup=kind==='backup';
 const d=modal(isBackup?'Backup Project':'Restore Project',`
  <p style="margin:0 0 12px;color:#596775">Choose where you want to ${isBackup?'save the backup':'restore the project from'}.</p>
  <button id="fvChoiceHosting" style="display:block;width:100%;padding:16px;margin:8px 0;background:#083a73;color:#fff;border-radius:12px;font-size:17px;font-weight:900">${isBackup?'BACKUP TO CLOUD':'RESTORE FROM CLOUD'}</button>
  <button id="fvChoiceDevice" style="display:block;width:100%;padding:16px;margin:8px 0;background:#e7edf4;color:#16202a;border-radius:12px;font-size:17px;font-weight:900">${isBackup?(isRecoveryMaster()?'SAVE CLEAN MASTER TO DEVICE':'BACKUP TO DEVICE'):'RESTORE FROM DEVICE'}</button>
  <div style="font-size:12px;color:#687480;margin-top:10px">${isBackup?'On iPhone/iPad, Backup to Device opens the normal share/save sheet so you can choose Save to Files, choose a folder, and change the filename before saving.':'Restore from Device opens the file picker so you can choose a FieldVerify backup saved on this phone, iCloud Drive, Files, or another available location.'}</div>`);
 d.querySelector('#fvChoiceHosting').onclick=()=>{d.remove();hostedAction(isBackup)};
 d.querySelector('#fvChoiceDevice').onclick=()=>{d.remove();if(isBackup&&isRecoveryMaster()){const a=window.FIELDVERIFY_CLEAN_ARCHIVE;if(!a||typeof a.save!=='function')return say('Clean Recovery Master backup is still loading. Try again in a moment.');a.save();return}isBackup?deviceBackup():deviceRestore()};
}
async function deviceBackup(){
 try{
  if(typeof buildProjectBackup!=='function')throw Error('Device backup engine is not ready');
  say('Preparing complete device backup…');
  const built=await buildProjectBackup(),payload=built?.payload||built;
  if(!payload||typeof payload!=='object')throw Error('Could not build project backup');
  const filename=`FieldVerify-Pro-${safeName(projectName())}-Backup-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.json`;
  const file=new File([JSON.stringify(payload)],filename,{type:'application/json'});
  preparedDevice={file,filename};
  const d=modal('Device Backup Ready',`<div style="background:#e7f7ec;border:1px solid #a9d6b5;border-radius:12px;padding:12px"><b>Backup is ready.</b><div style="font-size:13px;margin-top:5px">Nothing on the phone was deleted or changed.</div></div><button id="fvSavePreparedDevice" style="display:block;width:100%;padding:16px;margin:12px 0;background:#16803d;color:#fff;border-radius:12px;font-size:18px;font-weight:900">SAVE BACKUP TO FILES</button><div style="font-size:12px;color:#687480">Tap the green button. This fresh tap opens the iPhone share sheet; choose <b>Save to Files</b> and then choose iCloud Drive or On My iPhone.</div>`);
  d.querySelector('#fvSavePreparedDevice').onclick=savePreparedDevice;
 }catch(e){say(`Device backup failed: ${e.message}`)}
}
let preparedDevice=null;
async function savePreparedDevice(){
 const file=preparedDevice?.file;if(!file)return say('Build the device backup again');
 try{
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   await navigator.share({files:[file],title:`FieldVerify Pro - ${projectName()}`});say('Device backup saved/shared');return;
  }
 }catch(err){if(err?.name==='AbortError'){say('Device backup canceled');return}console.warn('Device share failed',err)}
 if(typeof downloadFile==='function'){downloadFile(file);say('Backup downloaded to device');return}
 const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);say('Backup downloaded to device');
}
function deviceRestore(){
 const input=document.getElementById('restoreInput');
 if(!input)return say('Device restore picker is not available');
 const oldParent=input.parentNode,oldNext=input.nextSibling,oldClass=input.className,oldStyle=input.getAttribute('style');
 let closed=false;
 const d=modal('Restore Backup from Device',`
  <div style="background:#fff4cc;border:1px solid #e5c04b;border-radius:12px;padding:12px;margin-bottom:12px"><b>Choose your FieldVerify backup file.</b><div style="font-size:13px;margin-top:5px">Use Files / iCloud Drive / On My iPhone. JSON backups and restorable FieldVerify PDFs are accepted.</div></div>
  <button id="fvOpenRestorePicker" style="display:block;width:100%;padding:16px;margin:8px 0;background:#083a73;color:#fff;border-radius:12px;font-size:18px;font-weight:900">SELECT BACKUP FROM FILES</button>
  <div id="fvRestoreInputMount" style="margin-top:10px"></div>
  <div style="font-size:12px;color:#687480;margin-top:10px">If the blue button does not open Files, tap the file selector shown directly below it.</div>`);
 const mount=d.querySelector('#fvRestoreInputMount');
 input.value='';
 input.accept='application/json,.json,.fip.json,application/pdf,.pdf';
 input.multiple=true;input.setAttribute('multiple','multiple');
 input.classList.remove('hidden');input.removeAttribute('hidden');
 input.style.cssText='display:block!important;width:100%;min-height:48px;padding:10px;border:1px solid #b9c4cf;border-radius:10px;background:#fff;color:#16202a;font-size:16px';
 mount.appendChild(input);
 function restoreInputHome(){
  if(oldClass)input.className=oldClass;else input.removeAttribute('class');
  if(oldStyle===null)input.removeAttribute('style');else input.setAttribute('style',oldStyle);
  if(oldParent){
   if(oldNext&&oldNext.parentNode===oldParent)oldParent.insertBefore(input,oldNext);else oldParent.appendChild(input);
  }else document.body.appendChild(input);
 }
 function close(){
  if(closed)return;closed=true;restoreInputHome();d.remove();
 }
 const closeBtn=d.querySelector('#fvChoiceClose');if(closeBtn)closeBtn.onclick=close;
 d.querySelector('#fvOpenRestorePicker').onclick=()=>{
  try{if(typeof input.showPicker==='function')input.showPicker();else input.click()}
  catch{try{input.click()}catch{say('Tap the file selector below to choose your backup')}}
 };
 input.addEventListener('change',()=>{if(input.files&&input.files.length)setTimeout(close,250)},{once:true});
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
