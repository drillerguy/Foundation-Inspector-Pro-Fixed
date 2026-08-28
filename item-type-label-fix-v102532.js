(()=>{
'use strict';
const VERSION='10.25.33-dropdown-dictates-title';
function cleanId(v,n){
  const raw=String(v||'').trim();
  const m=raw.match(/(?:E-|T-|C)?\s*(\d+)/i);
  return m?m[1]:String(n);
}
function formatItemName(n,r){
  try{
    const filter=document.getElementById('itemFilter');
    const selectedType=String(filter&&filter.value||'').trim();
    const recordType=(typeof itemType==='function'?itemType(r):(r&&r.itemType)||'Caisson');
    const type=selectedType||recordType||'Caisson';
    const custom=String(r&&r.itemLabel||'').trim();
    const id=cleanId(custom,n);
    if(type==='ERS') return `Sheet Number E-${id}`;
    if(type==='Tieback') return `Tieback ${id}`;
    if(type==='Caisson') return `Caisson ${id}`;
    return custom||`${type} ${id}`;
  }catch{return String(n)}
}
try{if(typeof itemName==='function')itemName=formatItemName}catch(e){console.warn('Item label override failed',e)}
function refresh(){try{if(typeof showTarget==='function')showTarget()}catch{}}
const filter=document.getElementById('itemFilter');
if(filter)filter.addEventListener('change',()=>setTimeout(refresh,0),true);
window.FIELDVERIFY_ITEM_LABELS={version:VERSION,formatItemName};
console.info(`FieldVerify item labels ${VERSION} loaded`);
})();
