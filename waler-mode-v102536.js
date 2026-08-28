(()=>{
'use strict';
const VERSION='10.25.36-waler-mode';
const filter=document.getElementById('itemFilter');
function install(){
  try{
    if(typeof ITEM_TYPES!=='undefined'&&Array.isArray(ITEM_TYPES)&&!ITEM_TYPES.includes('Waler'))ITEM_TYPES.push('Waler');
  }catch{}
  if(filter&&![...filter.options].some(o=>o.value==='Waler'||o.textContent==='Waler')){
    const o=document.createElement('option');o.value='Waler';o.textContent='Waler';filter.appendChild(o);
  }
  try{
    const cats=window.FIELDVERIFY_DRAWING_MANAGER&&window.FIELDVERIFY_DRAWING_MANAGER.categories;
    if(Array.isArray(cats)&&!cats.includes('Waler'))cats.push('Waler');
  }catch{}
}
install();setTimeout(install,100);setTimeout(install,600);setTimeout(install,1600);
window.FIELDVERIFY_WALER_MODE={version:VERSION,install};
console.info(`FieldVerify Waler mode ${VERSION} loaded`);
})();
