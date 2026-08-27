(()=>{
  const BUILD='10.25.9';
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
    loadScript('./drawing-manager-v1024.js?v=10.25.9','drawing-manager-v1024.js?v=10.25.9');
    loadScript('./drawing-delete-page-v1024.js?v=10.25.9','drawing-delete-page-v1024.js?v=10.25.9');
    loadScript('./caisson-final-workbook-import-v10253.js?v=10.25.9','caisson-final-workbook-import-v10253.js?v=10.25.9');
    loadScript('./poured-status-v10254.js?v=10.25.9','poured-status-v10254.js?v=10.25.9');
    loadScript('./inspection-status-fix-v10257.js?v=10.25.9','inspection-status-fix-v10257.js?v=10.25.9');
    loadScript('./ers-tieback-progress-v10259.js?v=10.25.9','ers-tieback-progress-v10259.js?v=10.25.9');
  }
  apply();loadHotfixes();
  setTimeout(apply,150);setTimeout(apply,800);setTimeout(loadHotfixes,500);setTimeout(loadHotfixes,1500);
})();
