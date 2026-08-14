(()=>{
  'use strict';
  const BUILD_VERSION='10.20';
  const BUILD_KEY='fieldVerifyInstalledBuild';
  let applying=false;

  function applyVersion(){
    if(applying)return;
    applying=true;
    try{
      const title=document.querySelector('.top .title');
      const expected=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
      if(title&&title.innerHTML!==expected)title.innerHTML=expected;
      const docTitle=`FieldVerify Pro v${BUILD_VERSION}`;
      if(document.title!==docTitle)document.title=docTitle;
      if(document.documentElement.getAttribute('data-fieldverify-version')!==BUILD_VERSION){
        document.documentElement.setAttribute('data-fieldverify-version',BUILD_VERSION);
      }
      if(localStorage.getItem(BUILD_KEY)!==BUILD_VERSION)localStorage.setItem(BUILD_KEY,BUILD_VERSION);
    }finally{applying=false;}
  }

  applyVersion();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyVersion,{once:true});
  setTimeout(applyVersion,150);
  setTimeout(applyVersion,500);
  setTimeout(applyVersion,1500);

  const observer=new MutationObserver(()=>applyVersion());
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-fieldverify-version']});

  window.FIELDVERIFY_BUILD=BUILD_VERSION;
  window.FieldVerifyApplyVersion=applyVersion;
  console.info(`FieldVerify build lock ${BUILD_VERSION} loaded`);
})();
