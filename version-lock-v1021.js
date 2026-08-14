(()=>{
  const BUILD='10.21';
  function apply(){
    const title=document.querySelector('.top .title');
    if(title && !String(title.textContent||'').includes(`v${BUILD}`)) title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD}`;
    document.documentElement.setAttribute('data-fieldverify-version',BUILD);
    try{localStorage.setItem('fieldVerifyInstalledBuild',BUILD)}catch{}
  }
  apply();
  const obs=new MutationObserver(apply);
  const target=document.querySelector('.top')||document.body||document.documentElement;
  if(target)obs.observe(target,{childList:true,subtree:true,characterData:true});
  setTimeout(apply,0);setTimeout(apply,150);setTimeout(apply,500);setTimeout(apply,1500);
})();
