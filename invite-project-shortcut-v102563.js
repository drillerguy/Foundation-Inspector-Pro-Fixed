(()=>{
'use strict';
const VERSION='10.25.63-invite-project-shortcut';
let opening=false;
function say(msg){try{toast(msg)}catch{}}
function relabel(){
  const manage=document.getElementById('fvManageAccess');
  if(manage&&manage.textContent.trim()!=='INVITE / SHARE CURRENT PROJECT')manage.textContent='INVITE / SHARE CURRENT PROJECT';
}
function add(){
  relabel();
  const gps=document.querySelector('.gpsline');
  if(!gps||document.getElementById('fvInviteProjectQuick'))return;
  const b=document.createElement('button');
  b.id='fvInviteProjectQuick';b.type='button';b.className='badge';
  b.textContent='Invite Project';
  b.style.cssText='color:#fff;background:#7b3fc6;border:1px solid #ffffff55;font-size:12px;font-weight:900;cursor:pointer';
  b.onclick=async()=>{
    if(opening)return;opening=true;
    try{
      const cloud=document.getElementById('fvCloudBtn');
      if(!cloud){say('Cloud sharing is still loading. Try Invite Project again in a moment.');return}
      cloud.click();
      let tries=0;
      const wait=()=>{
        relabel();
        const manage=document.getElementById('fvManageAccess');
        if(manage){manage.click();opening=false;return}
        if(++tries<12){setTimeout(wait,350);return}
        opening=false;
        const signedIn=document.getElementById('fvEmail')==null;
        if(signedIn)say('Connect the current project to Cloud first, then tap Invite Project again.');
        else say('Sign in to FieldVerify Cloud first, then tap Invite Project again.');
      };
      setTimeout(wait,250);
    }finally{
      setTimeout(()=>{opening=false},5000);
    }
  };
  gps.appendChild(b);
}
const obs=new MutationObserver(()=>{add();relabel()});
function start(){add();obs.observe(document.documentElement,{subtree:true,childList:true});setInterval(()=>{add();relabel()},1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.FIELDVERIFY_INVITE_SHORTCUT={version:VERSION};
})();
