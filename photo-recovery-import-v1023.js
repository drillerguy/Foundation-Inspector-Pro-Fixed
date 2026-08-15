(()=>{
'use strict';
const BUILD='10.23';
const RECOVERY_PREFIX='FieldVerify-PDF-Photo-Recovery-';
const unique=v=>[...new Set((v||[]).filter(Boolean).map(String))];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function isRecoveryFile(file){
  return file && String(file.name||'').startsWith(RECOVERY_PREFIX) && String(file.name||'').toLowerCase().endsWith('.json');
}

function decodeDataUrl(value){
  if(typeof value!=='string')throw new Error('Photo data is not text');
  const m=value.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if(!m)throw new Error('Invalid photo data URL');
  const type=m[1]||'image/jpeg';
  const encoded=m[3]||'';
  if(m[2]){
    const binary=atob(encoded.replace(/\s/g,''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type});
  }
  return new Blob([decodeURIComponent(encoded)],{type});
}

function requestPromise(req){
  return new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('IndexedDB request failed'));
  });
}
function transactionPromise(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
    tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
  });
}

async function putOnePhoto(p){
  const blob=decodeDataUrl(p.data);
  if(!blob.size)throw new Error('Decoded photo is empty');
  const db=await openDB();
  const tx=db.transaction('photos','readwrite');
  const done=transactionPromise(tx);
  const row={...p,blob};
  delete row.data;
  if(row.projectId==null)row.projectId=(typeof activeProjectId!=='undefined'?(activeProjectId||'legacy'):'legacy');
  await requestPromise(tx.objectStore('photos').put(row));
  await done;

  const verifyTx=db.transaction('photos','readonly');
  const verifyDone=transactionPromise(verifyTx);
  const verify=await requestPromise(verifyTx.objectStore('photos').get(String(p.id)));
  await verifyDone;
  if(!verify?.blob || !Number(verify.blob.size))throw new Error('Photo write verification failed');
  return verify;
}

async function importRecoveryFiles(files){
  let saved=0,failed=0,filesDone=0;
  const failedIds=[];
  let firstError='';
  for(const file of files){
    toast(`RECOVERING PHOTOS: file ${filesDone+1} of ${files.length}…`);
    let data;
    try{data=JSON.parse(await file.text())}
    catch(err){
      failed++; firstError=firstError||String(err?.message||err); failedIds.push(`${file.name}: unreadable`); filesDone++; continue;
    }
    const photos=Array.isArray(data.photos)?data.photos:[];
    const incoming=(data.records&&typeof data.records==='object')?data.records:{};
    for(const [n,r] of Object.entries(incoming)){
      if(!records[n])records[n]={...defaultRec()};
      const noPhotos={...(r||{})}; delete noPhotos.photos;
      records[n]={...records[n],...noPhotos,photos:unique(records[n].photos)};
    }

    for(let i=0;i<photos.length;i++){
      const p=photos[i];
      if(!p?.id||!p?.data){
        failed++; failedIds.push(String(p?.id||'unknown')); firstError=firstError||'Recovery photo missing id or image data'; continue;
      }
      try{
        const stored=await putOnePhoto(p);
        const n=String(stored.caisson??stored.number??stored.itemNumber??stored.item??'');
        if(n){
          if(!records[n])records[n]={...defaultRec()};
          records[n]={...records[n],photos:unique([...(records[n].photos||[]),String(stored.id)])};
        }
        saved++;
      }catch(err){
        const msg=String(err?.name?`${err.name}: ${err.message||''}`:(err?.message||err));
        console.error('Recovered photo write failed',p.id,err);
        firstError=firstError||msg;
        failed++; failedIds.push(String(p.id));
      }
      if(i%2===1){
        if(typeof persist==='function')persist();
        toast(`RECOVERING PHOTOS: ${saved} saved${failed?` · ${failed} failed`:''}`);
        await sleep(25);
      }
    }
    if(typeof persist==='function')persist();
    filesDone++;
    await sleep(75);
  }
  if(typeof persist==='function')persist();
  if(typeof renderPins==='function')renderPins();
  if(typeof showProjectHome==='function')showProjectHome();
  try{
    localStorage.setItem('fieldVerifyInstalledBuild',BUILD);
    localStorage.setItem('fieldVerifyLastPhotoRecovery',JSON.stringify({time:new Date().toISOString(),saved,failed,firstError,failedIds:failedIds.slice(0,200)}));
  }catch{}
  if(failed){
    toast(`PHOTO RECOVERY: ${saved} saved · ${failed} failed${firstError?` · ${firstError}`:''}`);
  }else{
    toast(`PHOTO RECOVERY COMPLETE: ${saved} pictures safely stored.`);
  }
  return {saved,failed,firstError,failedIds};
}

function install(){
  const input=document.getElementById('restoreInput');
  if(!input||window.__fieldVerifyRecovery1023)return;
  window.__fieldVerifyRecovery1023=true;
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
  window.FieldVerifyPdfPhotoRecovery={importRecoveryFiles,decodeDataUrl,putOnePhoto};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,500));
else setTimeout(install,500);
})();
