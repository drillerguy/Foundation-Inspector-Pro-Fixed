(()=>{
'use strict';
const VERSION='10.25.40-import-button-label';
const filter=document.getElementById('itemFilter');
function selectedLabel(){
  if(!filter)return 'CAISSON';
  const opt=filter.options&&filter.selectedIndex>=0?filter.options[filter.selectedIndex]:null;
  const text=String((opt&&opt.textContent)||filter.value||'Caisson').trim();
  return (text||'Caisson').toUpperCase();
}
function apply(){
  const b=document.getElementById('fvFinalCaissonImport');
  if(!b)return;
  const label=selectedLabel();
  b.textContent=`IMPORT ${label} EXCEL`;
  b.title=`Import Excel for ${label}`;
}
if(filter)filter.addEventListener('change',()=>setTimeout(apply,0),true);
const obs=new MutationObserver(apply);
obs.observe(document.body,{childList:true,subtree:true});
apply();setTimeout(apply,100);setTimeout(apply,700);setTimeout(apply,1800);
window.FIELDVERIFY_IMPORT_BUTTON_LABEL={version:VERSION,apply};
console.info(`FieldVerify import button label ${VERSION} loaded`);
})();
