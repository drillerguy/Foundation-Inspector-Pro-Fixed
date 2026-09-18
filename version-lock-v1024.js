(()=>{
'use strict';
const BUILD='10.25.77';
function apply(){const title=document.querySelector('.top .title');if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;document.title=`FieldVerify Pro v${BUILD}`;document.documentElement.setAttribute('data-fieldverify-version',BUILD);try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}}
function hasFile(file){return [...document.scripts].some(s=>String(s.src||'').includes('/'+file)||String(s.src||'').includes(file))}
function loadScript(file){if(hasFile(file))return Promise.resolve();return new Promise(resolve=>{const s=document.createElement('script');s.src=`./${file}?v=${BUILD}`;s.async=false;s.dataset.fieldverifyHotfix=file;s.onload=resolve;s.onerror=()=>{console.warn('FieldVerify optional module failed: '+file);resolve()};document.body.appendChild(s)})}
function ensureRecoveryButton(){
 const backup=document.getElementById('backupBtn'),restore=document.getElementById('restoreBtn');
 if((backup||restore)&&!document.getElementById('fvRecoveryDirectBtn')){
  const b=document.createElement('button');
  b.id='fvRecoveryDirectBtn';
  b.textContent='DATA RECOVERY';
  b.style.cssText='background:#7b3fc6!important;color:#fff!important;';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();location.href=`./recovery-master-v102577.html?v=${BUILD}`};
  (restore||backup).insertAdjacentElement('afterend',b);
 }
}
async function start(){
  apply();
  await new Promise(r=>setTimeout(r,250));
  await loadScript('ipad-stability-v102550.js');
  await loadScript('inspection-status-fix-v10257.js');
  await loadScript('office-report-split-v103.js');
  await loadScript('drawing-manager-v1024.js');
  await loadScript('waler-mode-v102536.js');
  await loadScript('drawing-manager-waler-patch-v102537.js');
  await loadScript('work-type-identity-v102570.js');
  await loadScript('ers-status-boxes-v102551.js');
  await loadScript('ers-pdf-loupe-v102556.js');
  await loadScript('ers-loupe-hitthrough-v102557.js');
  await loadScript('item-type-label-fix-v102532.js');
  await loadScript('work-type-isolation-patch-v102570.js');
  await loadScript('import-button-label-v102540.js');
  await loadScript('drawing-markup-v102539.js');
  await loadScript('daily-email-share-v102559.js');
  await loadScript('cloud-auth-fix-v1025.js');
  await loadScript('cloud-access-v1026.js');
  await loadScript('invite-email-v1024.js');
  await loadScript('invite-project-shortcut-v102563.js');
  await loadScript('cloud-sync-verify-v102564.js');
  await loadScript('data-recovery-v102566.js');
  ensureRecoveryButton();
  apply();
}
function lazy(file){loadScript(file).catch(()=>{})}
document.addEventListener('click',e=>{
  if(e.target?.closest?.('#backupBtn,#restoreBtn')){lazy('hosted-backup-v1024.js');lazy('backup-choice-v1024.js')}
  if(e.target?.closest?.('#cameraInput,#libraryInput,.photo-thumb,.photo')){lazy('photo-link-display-fix-v102521.js');lazy('photo-viewer-v1027.js')}
},true);
const obs=new MutationObserver(()=>ensureRecoveryButton());obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(ensureRecoveryButton,1200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();