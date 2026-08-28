(()=>{
'use strict';
const VERSION='10.25.34-dropdown-title-preserve-id';
function rawId(v,n){
  const raw=String(v||'').trim();
  return raw||String(n);
}
function formatItemName(n,r){
  try{
    const filter=document.getElementById('itemFilter');
    const selectedType=String(filter&&filter.value||'').trim();
    const recordType=(typeof itemType==='function'?itemType(r):(r&&r.itemType)||'Caisson');
    const type=selectedType||recordType||'Caisson';
    const id=rawId(r&&r.itemLabel,n);
    if(type==='ERS') return `Sheet Number ${id}`;
    if(type==='Tieback') return `Tieback ${id}`;
    if(type==='Caisson') return `Caisson ${id}`;
    return `${type} ${id}`;
  }catch{return String(n)}
}
try{if(typeof itemName==='function')itemName=formatItemName}catch(e){console.warn('Item label override failed',e)}
function refresh(){try{if(typeof showTarget==='function')showTarget()}catch{}}
const filter=document.getElementById('itemFilter');
if(filter)filter.addEventListener('change',()=>setTimeout(refresh,0),true);
window.FIELDVERIFY_ITEM_LABELS={version:VERSION,formatItemName};
console.info(`FieldVerify item labels ${VERSION} loaded`);
})();
