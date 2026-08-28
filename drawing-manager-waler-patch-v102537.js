(()=>{
'use strict';
const VERSION='10.25.38-waler-drawing-category-strong';
function addWalerToSelect(sel){
  if(!sel||sel.tagName!=='SELECT')return;
  const opts=Array.from(sel.options||[]);
  const texts=opts.map(o=>String(o.value||o.textContent||'').trim());
  const looksLikeDrawingType=sel.id==='fvDrawingCategory'||(
    texts.includes('Caisson')&&texts.includes('ERS')&&texts.includes('Tieback')&&texts.includes('Footing')
  );
  if(!looksLikeDrawingType||texts.includes('Waler'))return;
  const opt=document.createElement('option');opt.value='Waler';opt.textContent='Waler';
  const tie=opts.find(o=>String(o.value||o.textContent||'').trim()==='Tieback');
  if(tie&&tie.nextSibling)sel.insertBefore(opt,tie.nextSibling);else sel.appendChild(opt);
}
function apply(){
  try{
    const mgr=window.FIELDVERIFY_DRAWING_MANAGER;
    const cats=mgr&&mgr.categories;
    if(Array.isArray(cats)&&!cats.includes('Waler')){
      const tie=cats.indexOf('Tieback');
      cats.splice(tie>=0?tie+1:cats.length,0,'Waler');
    }
  }catch{}
  document.querySelectorAll('select').forEach(addWalerToSelect);
}
apply();
[0,50,150,400,900,1600,3000].forEach(ms=>setTimeout(apply,ms));
document.addEventListener('click',()=>setTimeout(apply,0),true);
document.addEventListener('change',()=>setTimeout(apply,0),true);
const obs=new MutationObserver(()=>apply());
obs.observe(document.documentElement,{childList:true,subtree:true});
window.FIELDVERIFY_WALER_DRAWING_PATCH={version:VERSION,apply};
console.info(`FieldVerify Waler drawing picker ${VERSION} loaded`);
})();
