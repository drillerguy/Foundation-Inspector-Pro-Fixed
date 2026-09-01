(()=>{
'use strict';
const BUILD='10.25.48';
function apply(){const title=document.querySelector('.top .title');if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;document.title=`FieldVerify Pro v${BUILD}`;document.documentElement.setAttribute('data-fieldverify-version',BUILD);try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}}
function hasFile(file){return [...document.scripts].some(s=>String(s.src||'').includes('/'+file)||String(s.src||'').includes(file))}
function loadScript(file){if(hasFile(file))return Promise.resolve();return new Promise(resolve=>{const s=document.createElement('script');s.src=`./${file}?v=${BUILD}`;s.async=false;s.dataset.fieldverifyHotfix=file;s.onload=resolve;s.onerror=()=>{console.warn('FieldVerify optional module failed: '+file);resolve()};document.body.appendChild(s)})}
async function start(){
  apply();
  await new Promise(r=>setTimeout(r,250));
  await loadScript('ipad-stability-v102546.js');
  await loadScript('inspection-status-fix-v10257.js');
  await loadScript('drawing-manager-v1024.js');
  await loadScript('waler-mode-v102536.js');
  await loadScript('drawing-manager-waler-patch-v102537.js');
  await loadScript('ers-touch-magnifier-v102516.js');
  await loadScript('item-type-label-fix-v102532.js');
  await loadScript('import-button-label-v102540.js');
  await loadScript('drawing-markup-v102539.js');
  apply();
}
function lazy(file){loadScript(file).catch(()=>{})}
document.addEventListener('click',e=>{
  if(e.target?.closest?.('#backupBtn,#restoreBtn')){lazy('hosted-backup-v1024.js');lazy('backup-choice-v1024.js')}
  if(e.target?.closest?.('#cameraInput,#libraryInput,.photo-thumb,.photo')){lazy('photo-link-display-fix-v102521.js');lazy('photo-viewer-v1027.js')}
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
