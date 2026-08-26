/* FieldVerify Pro v10.25.7 - inspection pin status fix */
(()=>{
'use strict';
if(window.FIELDVERIFY_INSPECTION_STATUS_FIX_10257)return;
window.FIELDVERIFY_INSPECTION_STATUS_FIX_10257=true;
function started(r){return Boolean(r&&(r.pickupTime||r.unloadTime||(Array.isArray(r.photos)&&r.photos.length)))}
function poured(r){return Boolean(r?.inspection?.caissonGeneral?.poured)}
function install(){
  if(typeof stateClass!=='function')return;
  stateClass=function(r,n){
    let c=`pin type-${itemType(r).toLowerCase()}`;
    if(num(r.lat)!=null&&num(r.lon)!=null)c+=' known';
    if(started(r))c+=' field-work';
    if((r.pickupTime||(Array.isArray(r.photos)&&r.photos.length))&&!r.unloadTime)c+=' picked';
    if(r.unloadTime)c+=' done';
    try{
      const s=effectiveNcrState(n);
      if(s==='open')c+=' ncr-open';
      else if(s==='pending')c+=' ncr-pending';
      else if(s==='cleared')c+=' ncr-cleared';
    }catch{}
    if(poured(r))c+=' fv-poured';
    return c;
  };
  stateClass._fvInspectionStatus10257=true;
  try{renderPins()}catch{}
}
setTimeout(install,0);setTimeout(install,250);setTimeout(install,1000);
})();
