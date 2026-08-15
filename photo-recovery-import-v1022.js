(()=>{
'use strict';
const BUILD='10.22';
const RECOVERY_PREFIX='FieldVerify-PDF-Photo-Recovery-';
const unique=v=>[...new Set((v||[]).filter(Boolean).map(String))];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function isRecoveryFile(file){
  return file && String(file.name||'').startsWith(RECOVERY_PREFIX) && String(file.name||'').toLowerCase().endsWith('.json');
}

function reqDone(req){
  return new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('IndexedDB request failed'));
  });
}
function txDone(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
    tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
  });
}
async function putOnePhoto(p){
  const db=await openDB();
  const blob=dataURLToBlob(p.data);
  const tx=db.transaction('photos','readwrite');
  const store=tx.objectStore('photos');
  const row={...p,blob,data:undefined,projectId:(p.projectId??(typeof activeProjectId!=='undefined'?activeProjectId:'legacy'))};
  const req=store.put(row);
  await reqDone(req);
  await txDone(tx);
  // Read it back so we only count/link a photo that is really stored.
  const verifyTx=db.transaction('photos','readonly');
  const verify=await reqDone(verifyTx.objectStore('photos').get(String(p.id)));
  await txDone(verifyTx);
  if(!verify?.blob || !verify.blob.size)throw new Error('Photo write verification failed');
  return verify;
}

async function importRecoveryFiles(files){
  let saved=0,failed=0,filesDone=0;
  const failedIds=[];
  for(const file of files){
    toast(`RECOVERING PHOTOS: file ${filesDone+1} of ${files.length}…`);
    let data;
    try{data=JSON.parse(await file.text())}catch(err){failed++;failedIds.push(`${file.name}: unreadable`);continue;}
    const photos=Array.isArray(data.photos)?data.photos:[];
    // Merge only non-photo record data now; photo IDs are linked only after verified storage.
    const incoming=(data.records&&typeof data.records==='object')?data.records:{};
    for(const [n,r] of Object.entries(incoming)){
      if(!records[n])records[n]={...defaultRec()};
      const noPhotos={...(r||{})}; delete noPhotos.photos;
      records[n]={...records[n],...noPhotos,photos:unique(records[n].photos)};
    }
    for(let i=0;i<photos.length;i++){
      const p=photos[i];
      if(!p?.id||!p?.data){failed++;failedIds.push(String(p?.id||'unknown'));continue;}
      try{
        const stored=await putOnePhoto(p);
        const n=String(stored.caisson??stored.number??stored.itemNumber??stored.item??'');
        if(n){
          if(!records[n])records[n]={...defaultRec()};
          records[n]={...records[n],photos:unique([...(records[n].photos||[]),String(stored.id)])};
        }
        saved++;
      }catch(err){
        console.error('Recovered photo write failed',p.id,err);
        failed++; failedIds.push(String(p.id));
      }
      if(i%2===1){
        if(typeof persist==='function')persist();
        toast(`RECOVERING PHOTOS: ${saved} saved${failed?` · ${failed} failed`:''}`);
        await sleep(20);
      }
    }
    if(typeof persist==='function')persist();
    filesDone++;
    await sleep(50);
  }
  if(typeof renderPins==='function')renderPins();
  if(typeof showProjectHome==='function')showProjectHome();
  localStorage.setItem('fieldVerifyInstalledBuild',BUILD);
  localStorage.setItem('fieldVerifyLastPhotoRecovery',JSON.stringify({time:new Date().toISOString(),saved,failed,failedIds:failedIds.slice(0,200)}));
  if(failed){
    toast(`PHOTO RECOVERY: ${saved} saved · ${failed} failed. Do not delete the recovery files.`);
  }else{
    toast(`PHOTO RECOVERY COMPLETE: ${saved} pictures safely stored.`);
  }
  return {saved,failed,failedIds};
}

function install(){
  const input=document.getElementById('restoreInput');
  if(!input||window.__fieldVerifyRecovery1022)return;
  window.__fieldVerifyRecovery1022=true;
  input.multiple=true; input.setAttribute('multiple','multiple');
  const previous=input.onchange;
  input.onchange=async e=>{
    const selected=[...(e.target.files||[])];
    if(!selected.length)return;
    if(selected.every(isRecoveryFile)){
      try{await importRecoveryFiles(selected)}catch(err){console.error(err);toast(`Photo recovery failed: ${err.message||err}`)}
      e.target.value='';
      return;
    }
    if(typeof previous==='function')return previous.call(input,e);
  };
  window.FieldVerifyPdfPhotoRecovery={importRecoveryFiles};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,350));
else setTimeout(install,350);
})();
