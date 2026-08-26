(()=>{
  const BUILD='10.25.5';
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
    loadScript('./caisson-final-workbook-import-v10253.js?v=10.25.5-single-import','caisson-final-workbook-import-v10253.js?v=10.25.5-single-import');
    loadScript('./poured-status-v10254.js?v=10.25.4','poured-status-v10254.js?v=10.25.4');
  }
  apply();loadHotfixes();
  setTimeout(apply,150);setTimeout(apply,800);setTimeout(loadHotfixes,500);
})();