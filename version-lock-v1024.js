(()=>{
  const BUILD='10.25.3';
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
    loadScript('./caisson-project-import-v1025.js?v=10.25.3-base','caisson-project-import-v1025.js?v=10.25.3-base');
    loadScript('./caisson-final-workbook-import-v10253.js?v=10.25.3-final','caisson-final-workbook-import-v10253.js?v=10.25.3-final');
  }
  apply();loadHotfixes();
  const obs=new MutationObserver(apply);
  const target=document.querySelector('.top')||document.body||document.documentElement;
  if(target)obs.observe(target,{childList:true,subtree:true,characterData:true});
  setTimeout(apply,0);setTimeout(apply,150);setTimeout(apply,500);setTimeout(apply,1500);
  setTimeout(loadHotfixes,0);setTimeout(loadHotfixes,500);setTimeout(loadHotfixes,1500);
})();
