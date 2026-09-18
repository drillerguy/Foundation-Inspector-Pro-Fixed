(()=>{
'use strict';
const BUILD='10.25.82-clean-archive';
const PROJECTS_KEY='fieldVerifyProjects',ACTIVE_KEY='fieldVerifyActiveProject';
const uniq=a=>[...new Set((a||[]).filter(Boolean).map(String))];

function readJson(k,f){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch{return f}}
function activeProjectInfo(){
  const id=localStorage.getItem(ACTIVE_KEY)||'';
  const ps=readJson(PROJECTS_KEY,[]);
  const p=(Array.isArray(ps)?ps:[]).find(x=>String(x?.id||'')===id);
  return{id,p};
}
function currentRecords(id){
  try{
    if(typeof activeProjectId!=='undefined'&&String(activeProjectId)===String(id)&&typeof records==='object')return records||{};
  }catch{}
  return readJson('fieldVerifyProjectRecords:'+id,{});
}
function currentNcr(id){
  try{
    if(typeof activeProjectId!=='undefined'&&String(activeProjectId)===String(id)&&Array.isArray(ncrRows))return ncrRows;
  }catch{}
  return readJson('fieldVerifyProjectNcr:'+id,[]);
}
function refsFrom(rs){return uniq(Object.values(rs||{}).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]))}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function openPhotosDb(){if(typeof openDB==='function')return openDB();return new Promise((res,rej)=>{const q=indexedDB.open('ordCaissonPhotos',3);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function blobToData(blob){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(blob)})}
async function exactPhotos(ids){
  const db=await openPhotosDb(),tx=db.transaction('photos','readonly'),s=tx.objectStore('photos'),rows=[];
  for(const id of ids){const p=await req(s.get(String(id)));if(p?.blob?.size)rows.push(p)}
  await txDone(tx).catch(()=>{});
  const out=[];
  for(let i=0;i<rows.length;i++){
    const p=rows[i]; const data=await blobToData(p.blob);
    out.push({...p,blob:undefined,data});
    try{toast('Archiving clean photos '+(i+1)+' of '+rows.length+'…')}catch{}
    if(i%4===3)await new Promise(r=>setTimeout(r,20));
  }
  return out;
}
async function sanitizeBasePayload(){
  let base={};
  try{
    if(typeof buildProjectBackup==='function'){
      const built=await buildProjectBackup();
      base=built?.payload||built||{};
    }
  }catch(e){console.warn('Base backup unavailable',e)}
  return (base&&typeof base==='object')?base:{};
}
async function makeCleanArchive(){
  const a=activeProjectInfo();
  if(!a.id||!a.p?.recoveryMaster)throw Error('Open the Recovery Master first.');
  const rs=JSON.parse(JSON.stringify(currentRecords(a.id)||{}));
  const ncr=JSON.parse(JSON.stringify(currentNcr(a.id)||[]));
  const refs=refsFrom(rs);
  const photos=await exactPhotos(refs);
  const have=new Set(photos.map(p=>String(p.id)));
  const missing=refs.filter(id=>!have.has(String(id)));
  const base=await sanitizeBasePayload();

  const payload={
    ...base,
    type:'fieldverify-clean-recovery-master-archive',
    backupFormat:'FieldVerify Clean Recovery Master Archive',
    cleanArchiveBuild:BUILD,
    created:new Date().toISOString(),
    project:{...(a.p||{}),id:a.id},
    records:rs,
    ncrRows:ncr,
    photos,
    recoveryMeta:readJson('fieldVerifyRecoveryMasterMeta:'+a.id,null),
    archiveManifest:{
      masterId:a.id,
      recordCount:Object.keys(rs).length,
      referencedPhotoIds:refs.length,
      embeddedPhotos:photos.length,
      missingPhotoIds:missing,
      exactReferencedPhotosOnly:true,
      excludesUnlinkedPhotoRows:true
    }
  };
  // Remove any extra photo payloads inherited from older backup code.
  payload.photos=photos;
  payload.records=rs;
  payload.ncrRows=ncr;
  return{payload,missing,photoCount:photos.length,recordCount:Object.keys(rs).length};
}
async function saveCleanArchive(){
  try{
    toast('Building CLEAN Recovery Master archive…');
    const built=await makeCleanArchive();
    const filename='FieldVerify-CLEAN-Recovery-Master-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.json';
    const file=new File([JSON.stringify(built.payload)],filename,{type:'application/json'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      try{
        await navigator.share({files:[file],title:'FieldVerify Clean Recovery Master'});
        toast('Clean Recovery Master archive ready: '+built.recordCount+' records · '+built.photoCount+' photos'+(built.missing.length?' · '+built.missing.length+' unresolved missing':''));
        return;
      }catch(e){if(e?.name==='AbortError'){toast('Archive save canceled');return}}
    }
    if(typeof downloadFile==='function')downloadFile(file);
    else{
      const u=URL.createObjectURL(file),x=document.createElement('a');x.href=u;x.download=filename;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);
    }
    toast('Clean Recovery Master archive saved: '+built.recordCount+' records · '+built.photoCount+' photos'+(built.missing.length?' · '+built.missing.length+' unresolved missing':''));
  }catch(e){console.error(e);try{toast('Clean archive failed: '+(e.message||e))}catch{}}
}
function bind(){
  const backup=document.getElementById('backupBtn'),restore=document.getElementById('restoreBtn');
  if(!(backup||restore)||document.getElementById('fvCleanMasterArchiveBtn'))return;
  const b=document.createElement('button');
  b.id='fvCleanMasterArchiveBtn';
  b.textContent='SAVE CLEAN RECOVERY MASTER';
  b.style.cssText='background:#16803d!important;color:#fff!important;';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();saveCleanArchive()};
  (backup||restore).insertAdjacentElement('afterend',b);
}
const obs=new MutationObserver(bind);obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(bind,1200);setTimeout(bind,300);
window.FIELDVERIFY_CLEAN_ARCHIVE={build:BUILD,save:saveCleanArchive,make:makeCleanArchive};
})();