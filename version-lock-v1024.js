(()=>{
  const BUILD='10.25.34';
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
    loadScript('./drawing-manager-v1024.js?v=10.25.34','drawing-manager-v1024.js?v=10.25.34');
    loadScript('./drawing-delete-page-v1024.js?v=10.25.34','drawing-delete-page-v1024.js?v=10.25.34');
    loadScript('./caisson-final-workbook-import-v10253.js?v=10.25.34','caisson-final-workbook-import-v10253.js?v=10.25.34');
    loadScript('./poured-status-v10254.js?v=10.25.34','poured-status-v10254.js?v=10.25.34');
    loadScript('./inspection-status-fix-v10257.js?v=10.25.34','inspection-status-fix-v10257.js?v=10.25.34');
    loadScript('./ers-touch-magnifier-v102516.js?v=10.25.34','ers-touch-magnifier-v102516.js?v=10.25.34');
    loadScript('./item-type-label-fix-v102532.js?v=10.25.34','item-type-label-fix-v102532.js?v=10.25.34');
    loadScript('./cloud-sync-v1024.js?v=10.25.34','cloud-sync-v1024.js?v=10.25.34');
    loadScript('./cloud-photo-accelerator-v1024.js?v=10.25.34','cloud-photo-accelerator-v1024.js?v=10.25.34');
    loadScript('./hosted-backup-v1024.js?v=10.25.34','hosted-backup-v1024.js?v=10.25.34');
    loadScript('./backup-choice-v1024.js?v=10.25.34','backup-choice-v1024.js?v=10.25.34');
    loadScript('./cloud-photo-upload-fix-v102518.js?v=10.25.34','cloud-photo-upload-fix-v102518.js?v=10.25.34');
    loadScript('./photo-link-display-fix-v102521.js?v=10.25.34','photo-link-display-fix-v102521.js?v=10.25.34');
    loadScript('./photo-viewer-v1027.js?v=10.25.34','photo-viewer-v1027.js?v=10.25.34');
  }
  apply();loadHotfixes();
  setTimeout(apply,150);setTimeout(apply,800);setTimeout(loadHotfixes,500);setTimeout(loadHotfixes,1500);
})();