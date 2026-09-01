/* FieldVerify Pro v10.25.47 - pin status truth fix */
(()=>{
'use strict';
window.FIELDVERIFY_INSPECTION_STATUS_FIX_10257=true;
function started(r){return Boolean(r&&(r.pickupTime||(Array.isArray(r.photos)&&r.photos.length)))}
function completed(r){return Boolean(r&&r.unloadTime)}
function poured(r){return Boolean(r?.inspection?.caissonGeneral?.poured)}
function install(){
  if(typeof stateClass!=='function')return;
  stateClass=function(r,n){
    r=r||{};
    let c=`pin type-${itemType(r).toLowerCase()}`;
    if(num(r.lat)!=null&&num(r.lon)!=null)c+=' known';
    if(started(r)&&!completed(r))c+=' field-work picked';
    if(completed(r))c+=' done';
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
install();setTimeout(install,150);
})();
