/* FieldVerify Pro v10.24 - current drawing/page delete confirmation */
(()=>{
'use strict';
const VERSION='10.24-drawing-delete-page-1';
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function currentLabel(){const s=document.getElementById('drawingFilter');return s?.selectedOptions?.[0]?.textContent?.trim()||'current drawing'}
function ensureButton(){
 const b=document.getElementById('deleteDrawingBtn');if(!b||b.dataset.currentDeleteReady==='1')return;
 b.dataset.currentDeleteReady='1';b.textContent='Delete Page';b.title='Delete the drawing currently shown on screen';b.setAttribute('aria-label','Delete current drawing page');
 b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();showDeleteWarning()},true);
}
function showDeleteWarning(){
 const s=document.getElementById('drawingFilter');if(!s?.value)return;
 document.getElementById('fvDeleteDrawingPageModal')?.remove();
 const modal=document.createElement('div');modal.id='fvDeleteDrawingPageModal';modal.style.cssText='position:fixed;inset:0;z-index:1600;background:#000a;display:grid;place-items:center;padding:18px';
 modal.innerHTML=`<div style="width:min(500px,100%);background:#fff;color:#16202a;border-radius:18px;padding:20px;box-shadow:0 12px 40px #0008"><h2 style="margin:0 0 10px;color:#b42318">Delete Current Drawing?</h2><p style="margin:0 0 10px;font-weight:900">WARNING: This deletes the current drawing shown on the screen.</p><div style="padding:12px;background:#f7eeee;border:1px solid #e4b7b7;border-radius:10px;font-weight:800">${esc(currentLabel())}</div><p style="font-size:13px;color:#5d6873">Only this drawing/page is removed. Inspection records, notes, NCRs, GPS information and photos are not deleted.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px"><button id="fvCancelDrawingDelete" type="button" style="padding:14px;background:#e7edf4;color:#16202a">CANCEL</button><button id="fvConfirmDrawingDelete" type="button" style="padding:14px;background:#b42318;color:#fff">DELETE CURRENT DRAWING</button></div></div>`;
 document.body.appendChild(modal);
 modal.querySelector('#fvCancelDrawingDelete').onclick=()=>modal.remove();
 modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
 modal.querySelector('#fvConfirmDrawingDelete').onclick=async()=>{
   const btn=modal.querySelector('#fvConfirmDrawingDelete');btn.disabled=true;btn.textContent='DELETING…';
   try{
     const fn=window.FIELDVERIFY_DRAWING_MANAGER?.deleteSelected;if(typeof fn!=='function')throw Error('Drawing delete control is unavailable');
     modal.remove();
     const oldConfirm=window.confirm;window.confirm=()=>true;
     try{await fn()}finally{window.confirm=oldConfirm}
   }catch(err){try{toast(`Drawing was not deleted: ${err.message||err}`)}catch{alert(`Drawing was not deleted: ${err.message||err}`)}}
 };
}
setInterval(ensureButton,1000);setTimeout(ensureButton,100);
window.FIELDVERIFY_DRAWING_DELETE_PAGE={version:VERSION,confirmDelete:showDeleteWarning};
console.info(`FieldVerify drawing delete page ${VERSION} loaded`);
})();

// Load the memory-safe shared-source PDF drawing layer after the drawing manager.
// This stores large multi-page PDFs only once and lazy-loads page thumbnails.
import('./large-pdf-safe-v1024.js?v=10.24.1').catch(err=>console.warn('Large PDF safe loader unavailable',err));