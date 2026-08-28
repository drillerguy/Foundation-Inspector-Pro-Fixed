(()=>{
'use strict';
const VERSION='10.25.37-waler-drawing-category';
function apply(){
  const mgr=window.FIELDVERIFY_DRAWING_MANAGER;
  const cats=mgr&&mgr.categories;
  if(Array.isArray(cats)&&!cats.includes('Waler')){
    const at=Math.max(0,cats.indexOf('Tieback')+1);
    cats.splice(at,0,'Waler');
  }
  const sel=document.getElementById('fvDrawingCategory');
  if(sel&&!Array.from(sel.options).some(o=>o.value==='Waler'||o.textContent==='Waler')){
    const opt=document.createElement('option');
    opt.value='Waler';opt.textContent='Waler';
    const tie=Array.from(sel.options).find(o=>o.value==='Tieback'||o.textContent==='Tieback');
    if(tie&&tie.nextSibling)sel.insertBefore(opt,tie.nextSibling);else sel.appendChild(opt);
  }
}
apply();
setTimeout(apply,100);setTimeout(apply,500);
const obs=new MutationObserver(apply);
obs.observe(document.body,{childList:true,subtree:true});
window.FIELDVERIFY_WALER_DRAWING_PATCH={version:VERSION,apply};
console.info(`FieldVerify Waler drawing category ${VERSION} loaded`);
})();
