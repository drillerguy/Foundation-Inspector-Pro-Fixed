(()=>{
  'use strict';
  // Legacy compatibility shim. This file used to force v10.20 forever via a
  // MutationObserver, which could overwrite the current build label after the
  // modern version lock had already loaded. Never downgrade a newer build.
  const LEGACY_VERSION='10.20';
  const BUILD_KEY='fieldVerifyInstalledBuild';
  function parts(v){return String(v||'').split('.').map(x=>parseInt(x,10)||0)}
  function cmp(a,b){const A=parts(a),B=parts(b),n=Math.max(A.length,B.length);for(let i=0;i<n;i++){const d=(A[i]||0)-(B[i]||0);if(d)return d}return 0}
  function current(){
    const attr=document.documentElement.getAttribute('data-fieldverify-version')||'';
    const global=String(window.FIELDVERIFY_BUILD||'');
    const stored=localStorage.getItem(BUILD_KEY)||'';
    let best='';
    for(const v of [attr,global,stored])if(v&&(!best||cmp(v,best)>0))best=v;
    return best;
  }
  function applyLegacyOnly(){
    const cur=current();
    if(cur&&cmp(cur,LEGACY_VERSION)>0)return;
    const title=document.querySelector('.top .title');
    if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${LEGACY_VERSION} stable</span>`;
    document.title=`FieldVerify Pro v${LEGACY_VERSION}`;
    document.documentElement.setAttribute('data-fieldverify-version',LEGACY_VERSION);
    try{localStorage.setItem(BUILD_KEY,LEGACY_VERSION)}catch{}
  }
  // Apply only if no newer build lock exists. Do not observe mutations and do
  // not keep reapplying this legacy version.
  setTimeout(applyLegacyOnly,50);
  console.info('FieldVerify legacy v10.20 lock disabled when newer build is present');
})();