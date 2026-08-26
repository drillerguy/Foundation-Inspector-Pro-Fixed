(()=>{
  const BUILD='10.25.2';
  function apply(){
    const title=document.querySelector('.top .title');
    if(title && !String(title.textContent||'').includes(`v${BUILD}`)) title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD}`;
    document.documentElement.setAttribute('data-fieldverify-version',BUILD);
    try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}
  }
  function loadHotfix(){
    const src='./caisson-project-import-v1025.js?v=10.25.2-excel-parser-fix';
    const existing=[...document.scripts].find(s=>String(s.src||'').includes('caisson-project-import-v1025.js')&&String(s.src||'').includes('10.25.2-excel-parser-fix'));
    if(existing)return;
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.fieldverifyHotfix='caisson-project-import';
    s.onerror=()=>console.error('FieldVerify caisson import hotfix failed to load');
    document.body.appendChild(s);
  }
  apply();
  loadHotfix();
  const obs=new MutationObserver(apply);
  const target=document.querySelector('.top')||document.body||document.documentElement;
  if(target)obs.observe(target,{childList:true,subtree:true,characterData:true});
  setTimeout(apply,0);setTimeout(apply,150);setTimeout(apply,500);setTimeout(apply,1500);
  setTimeout(loadHotfix,0);setTimeout(loadHotfix,500);
})();
