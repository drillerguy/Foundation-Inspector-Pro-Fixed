(()=>{
  const BUILD='10.25.22';
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
    loadScript('./drawing-manager-v1024.js?v=10.25.22','drawing-manager-v1024.js?v=10.25.22');
    loadScript('./drawing-delete-page-v1024.js?v=10.25.22','drawing-delete-page-v1024.js?v=10.25.22');
    loadScript('./caisson-final-workbook-import-v10253.js?v=10.25.22','caisson-final-workbook-import-v10253.js?v=10.25.22');
    loadScript('./poured-status-v10254.js?v=10.25.22','poured-status-v10254.js?v=10.25.22');
    loadScript('./inspection-status-fix-v10257.js?v=10.25.22','inspection-status-fix-v10257.js?v=10.25.22');
    loadScript('./ers-touch-magnifier-v102516.js?v=10.25.22','ers-touch-magnifier-v102516.js?v=10.25.22');
    loadScript('./cloud-sync-v1024.js?v=10.25.22','cloud-sync-v1024.js?v=10.25.22');
    loadScript('./cloud-photo-accelerator-v1024.js?v=10.25.22','cloud-photo-accelerator-v1024.js?v=10.25.22');
    loadScript('./hosted-backup-v1024.js?v=10.25.22','hosted-backup-v1024.js?v=10.25.22');
    loadScript('./backup-choice-v1024.js?v=10.25.22','backup-choice-v1024.js?v=10.25.22');
    loadScript('./cloud-photo-upload-fix-v102518.js?v=10.25.22','cloud-photo-upload-fix-v102518.js?v=10.25.22');
    loadScript('./photo-link-display-fix-v102521.js?v=10.25.22','photo-link-display-fix-v102521.js?v=10.25.22');
    loadScript('./photo-viewer-v1027.js?v=10.25.22','photo-viewer-v1027.js?v=10.25.22');
  }
  apply();loadHotfixes();
  setTimeout(apply,150);setTimeout(apply,800);setTimeout(loadHotfixes,500);setTimeout(loadHotfixes,1500);
})();