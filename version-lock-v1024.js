(()=>{
  const BUILD='10.25.17';
  function apply(){
    const title=document.querySelector('.top .title');
    if(title && !String(title.textContent||'').includes(`v${BUILD}`)) title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD}`;
    document.documentElement.setAttribute('data-fieldverify-version',BUILD);
    try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}
  }
  function loadScript(src,key){
    if([...document.scripts].some(s=>String(s.src||'').includes(key)))return;
    const s=document.createElement('script');s.src=src;s.async=false;s.dataset.fieldverifyHotfix=key;s.onerror=()=>console.error('FieldVerify hotfix failed to load: '+key);document.body.appendChild(s);
  }
  function loadHotfixes(){
    loadScript('./drawing-manager-v1024.js?v=10.25.17','drawing-manager-v1024.js?v=10.25.17');
    loadScript('./drawing-delete-page-v1024.js?v=10.25.17','drawing-delete-page-v1024.js?v=10.25.17');
    loadScript('./caisson-final-workbook-import-v10253.js?v=10.25.17','caisson-final-workbook-import-v10253.js?v=10.25.17');
    loadScript('./poured-status-v10254.js?v=10.25.17','poured-status-v10254.js?v=10.25.17');
    loadScript('./inspection-status-fix-v10257.js?v=10.25.17','inspection-status-fix-v10257.js?v=10.25.17');
    loadScript('./ers-touch-magnifier-v102516.js?v=10.25.17','ers-touch-magnifier-v102516.js?v=10.25.17');

    // Cloud modules must be present on every device. These are intentionally
    // loaded here as well as from the base app so old cached HTML cannot omit them.
    loadScript('./cloud-sync-v1024.js?v=10.25.17','cloud-sync-v1024.js?v=10.25.17');
    loadScript('./cloud-photo-accelerator-v1024.js?v=10.25.17','cloud-photo-accelerator-v1024.js?v=10.25.17');
    loadScript('./hosted-backup-v1024.js?v=10.25.17','hosted-backup-v1024.js?v=10.25.17');
    loadScript('./backup-choice-v1024.js?v=10.25.17','backup-choice-v1024.js?v=10.25.17');
  }
  apply();loadHotfixes();
  setTimeout(apply,150);setTimeout(apply,800);setTimeout(loadHotfixes,500);setTimeout(loadHotfixes,1500);
})();
