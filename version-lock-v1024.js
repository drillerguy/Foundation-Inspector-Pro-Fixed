(()=>{
  const BUILD='10.25.42';
  function apply(){
    const title=document.querySelector('.top .title');
    if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD}`;
    document.documentElement.setAttribute('data-fieldverify-version',BUILD);
    try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}
  }
  function loadScript(file){
    if([...document.scripts].some(s=>String(s.src||'').includes('/'+file)||String(s.src||'').includes(file)))return;
    const s=document.createElement('script');
    s.src=`./${file}?v=${BUILD}`;
    s.async=false;
    s.dataset.fieldverifyHotfix=file;
    s.onerror=()=>console.error('FieldVerify hotfix failed to load: '+file);
    document.body.appendChild(s);
  }
  function loadHotfixes(){
    const files=['drawing-manager-v1024.js','drawing-manager-waler-patch-v102537.js','waler-mode-v102536.js','drawing-markup-v102539.js','import-button-label-v102540.js','drawing-delete-page-v1024.js','caisson-final-workbook-import-v10253.js','poured-status-v10254.js','inspection-status-fix-v10257.js','ers-touch-magnifier-v102516.js','item-type-label-fix-v102532.js','cloud-sync-v1024.js','cloud-photo-accelerator-v1024.js','hosted-backup-v1024.js','backup-choice-v1024.js','cloud-photo-upload-fix-v102518.js','photo-link-display-fix-v102521.js','photo-viewer-v1027.js'];
    for(const file of files)loadScript(file);
  }
  async function stabilizeWorker(){
    if(!('serviceWorker' in navigator))return;
    try{
      const reg=await navigator.serviceWorker.register(`./sw.js?v=${BUILD}`,{updateViaCache:'none'});
      if(reg&&reg.update)reg.update().catch(()=>{});
    }catch(e){console.warn('FieldVerify worker stabilization failed',e)}
  }
  apply();
  setTimeout(()=>{loadHotfixes();stabilizeWorker()},0);
  setTimeout(apply,300);
})();