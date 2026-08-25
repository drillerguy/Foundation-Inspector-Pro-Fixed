/* FieldVerify Pro v10.24 - Project Home total saved photos metric */
(()=>{
'use strict';
const VERSION='10.24-project-home-photo-count-1';
const coreShowProjectHome=typeof showProjectHome==='function'?showProjectHome:null;
function totalProjectPhotos(){
  const ids=new Set();
  try{
    for(const r of Object.values(typeof records==='object'&&records||{})){
      for(const id of (Array.isArray(r?.photos)?r.photos:[])) if(id!=null&&String(id)) ids.add(String(id));
    }
  }catch{}
  return ids.size;
}
function addMetric(){
  const grid=document.querySelector('#panel .dashboard-grid');
  if(!grid)return;
  let card=document.getElementById('fvProjectPhotoMetric');
  if(!card){
    card=document.createElement('div');
    card.id='fvProjectPhotoMetric';
    card.className='metric';
    card.innerHTML='<b id="fvProjectPhotoCount">0</b><span>Total photos saved</span>';
    grid.appendChild(card);
  }
  const count=document.getElementById('fvProjectPhotoCount');
  if(count)count.textContent=String(totalProjectPhotos());
}
if(coreShowProjectHome){
  showProjectHome=function(){const out=coreShowProjectHome.apply(this,arguments);addMetric();return out};
}
document.addEventListener('click',e=>{if(e.target?.closest?.('#projectsBtn,.openProject'))setTimeout(addMetric,100)},true);
setTimeout(addMetric,150);
window.FIELDVERIFY_PROJECT_HOME_PHOTOS={version:VERSION,count:totalProjectPhotos,refresh:addMetric};
console.info(`FieldVerify project home photo count ${VERSION} loaded`);
})();
