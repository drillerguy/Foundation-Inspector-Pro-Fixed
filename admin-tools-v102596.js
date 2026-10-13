/* Keep emergency recovery controls out of everyday project work. */
(()=>{
'use strict';
const tools=[['fvRecoveryDirectBtn','Recovery center'],['fvRecoveryBtn','Scan / import recovery data'],['fvRecentPhotoRescueBtn','Rescue recent photos'],['fvCleanMasterArchiveBtn','Save clean recovery master']];
function close(){document.getElementById('fvAdminToolsModal')?.classList.add('hidden')}
function open(){collect();document.getElementById('fvAdminToolsModal')?.classList.remove('hidden')}
function collect(){
 let modal=document.getElementById('fvAdminToolsModal');
 if(!modal){modal=document.createElement('div');modal.id='fvAdminToolsModal';modal.className='hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','fvAdminTitle');modal.style.cssText='position:fixed;inset:0;z-index:1600;background:#000a;padding:18px;overflow:auto';modal.innerHTML='<div style="max-width:520px;margin:6vh auto;background:white;color:#16202a;border-radius:18px;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 id="fvAdminTitle" style="margin:0">Admin / Emergency Tools</h2><button id="fvAdminClose" style="padding:10px">Close</button></div><p>Recovery tools for troubleshooting missing data or rebuilding a recovery master.</p><div id="fvAdminToolList" style="display:grid;gap:10px"></div></div>';document.body.appendChild(modal);document.getElementById('fvAdminClose').onclick=close}
 const list=document.getElementById('fvAdminToolList');
 for(const [id,label] of tools){const button=document.getElementById(id);if(button&&button.parentElement!==list){button.textContent=label;button.style.cssText='padding:14px;background:#e7edf4;color:#16202a;border-radius:10px;text-align:left';button.addEventListener('click',close);list.appendChild(button)}}
 const backup=document.getElementById('backupBtn'),restore=document.getElementById('restoreBtn');
 if((backup||restore)&&!document.getElementById('fvAdminToolsBtn')){const button=document.createElement('button');button.id='fvAdminToolsBtn';button.textContent='Admin / Emergency Tools';button.style.cssText='background:#e7edf4;color:#596775;font-size:12px;padding:10px';button.onclick=open;(restore||backup).parentElement.appendChild(button)}
}
const observer=new MutationObserver(collect);observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',collect,{once:true});else collect();
window.FIELDVERIFY_ADMIN_TOOLS={open,close};
})();
