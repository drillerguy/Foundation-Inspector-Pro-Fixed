(()=>{
'use strict';
const BUILD='10.25.45';
function apply(){const title=document.querySelector('.top .title');if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;document.title=`FieldVerify Pro v${BUILD}`;document.documentElement.setAttribute('data-fieldverify-version',BUILD);try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}}
function hasFile(file){return [...document.scripts].some(s=>String(s.src||'').includes('/'+file)||String(s.src||'').includes(file))}
function loadScript(file){if(hasFile(file))return Promise.resolve();return new Promise(resolve=>{const s=document.createElement('script');s.src=`./${file}?v=${BUILD}`;s.async=false;s.dataset.fieldverifyHotfix=file;s.onload=resolve;s.onerror=()=>{console.warn('FieldVerify optional module failed: '+file);resolve()};document.body.appendChild(s)})}
const ESSENTIAL=['drawing-manager-v1024.js','drawing-manager-waler-patch-v102537.js','waler-mode-v102536.js','drawing-delete-page-v1024.js','ers-touch-magnifier-v102516.js','item-type-label-fix-v102532.js','import-button-label-v102540.js','drawing-markup-v102539.js','caisson-final-workbook-import-v10253.js','poured-status-v10254.js','inspection-status-fix-v10257.js'];
const LATER=['hosted-backup-v1024.js','backup-choice-v1024.js','cloud-photo-upload-fix-v102518.js','photo-link-display-fix-v102521.js','photo-viewer-v1027.js'];
async function loadGroup(files,gap=90){for(const file of files){await loadScript(file);if(gap)await new Promise(r=>setTimeout(r,gap))}}
function start(){apply();setTimeout(()=>loadGroup(ESSENTIAL,70),700);setTimeout(()=>loadGroup(LATER,120),3200);setTimeout(apply,400)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
