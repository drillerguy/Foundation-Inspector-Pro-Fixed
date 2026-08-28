(()=>{
'use strict';
const VERSION='10.25.32-item-type-labels';
function formatItemName(n,r){
  try{
    const type=(typeof itemType==='function'?itemType(r):(r&&r.itemType)||'Caisson');
    const custom=String(r&&r.itemLabel||'').trim();
    if(type==='ERS'){
      const id=custom||`E-${n}`;
      return `Sheet Number ${id}`;
    }
    if(type==='Tieback'){
      const id=custom||String(n);
      return `Tieback Number ${id}`;
    }
    if(type==='Caisson'){
      const id=custom||String(n);
      return `Caisson ${id}`;
    }
    return custom||`${type} ${n}`;
  }catch{return String(n)}
}
try{
  if(typeof itemName==='function') itemName=formatItemName;
}catch(e){console.warn('Item label override failed',e)}
function refresh(){
  try{
    if(typeof showTarget==='function')showTarget();
  }catch{}
}
const filter=document.getElementById('itemFilter');
if(filter)filter.addEventListener('change',()=>setTimeout(refresh,0),true);
window.FIELDVERIFY_ITEM_LABELS={version:VERSION,formatItemName};
console.info(`FieldVerify item labels ${VERSION} loaded`);
})();
