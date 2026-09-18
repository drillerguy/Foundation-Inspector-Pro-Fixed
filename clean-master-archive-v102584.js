(()=>{
'use strict';
const BUILD='10.25.88-clean-archive';
const PROJECTS_KEY='fieldVerifyProjects',ACTIVE_KEY='fieldVerifyActiveProject';
const uniq=a=>[...new Set((a||[]).filter(Boolean).map(String))];
let prepared=null;

function readJson(k,f){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch{return f}}
function activeProjectInfo(){
  const id=localStorage.getItem(ACTIVE_KEY)||'';
  const ps=readJson(PROJECTS_KEY,[]);
  const p=(Array.isArray(ps)?ps:[]).find(x=>String(x&&x.id||'')===id);
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
function refsFrom(rs){return uniq(Object.values(rs||{}).flatMap(r=>Array.isArray(r&&r.photos)?r.photos:[]))}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function openPhotosDb(){
  if(typeof openDB==='function')return openDB();
  return new Promise((res,rej)=>{const q=indexedDB.open('ordCaissonPhotos',3);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})
}
function extFor(p){
  const t=String(p&&((p.type)||(p.blob&&p.blob.type))||'').toLowerCase();
  if(t.includes('png'))return'png';
  if(t.includes('webp'))return'webp';
  if(t.includes('gif'))return'gif';
  return'jpg';
}
function cleanPhotoMeta(p){
  const x={...p};
  delete x.blob;delete x.data;
  return x;
}
function modal(title,body){
  document.getElementById('fvCleanArchiveModal')?.remove();
  const d=document.createElement('div');d.id='fvCleanArchiveModal';
  d.style.cssText='position:fixed;inset:0;z-index:1600;background:#000a;padding:18px;overflow:auto';
  d.innerHTML='<div style="max-width:560px;margin:6vh auto;background:#fff;color:#16202a;border-radius:18px;padding:18px;box-shadow:0 10px 40px #0007"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h2 style="margin:0">'+title+'</h2><button id="fvCleanClose" style="padding:10px;background:#e7edf4;color:#16202a">Close</button></div><div id="fvCleanBody" style="margin-top:14px">'+body+'</div></div>';
  document.body.appendChild(d);
  d.querySelector('#fvCleanClose').onclick=()=>d.remove();
  return d;
}
function setBody(html){const e=document.getElementById('fvCleanBody');if(e)e.innerHTML=html}
function progress(done,total,label){
  setBody('<p style="margin:0 0 10px"><b>'+label+'</b></p><div style="height:12px;background:#e7edf4;border-radius:999px;overflow:hidden"><div style="height:100%;width:'+(total?Math.round(done/total*100):0)+'%;background:#16803d"></div></div><p style="font-size:13px;color:#596775">'+done+' of '+total+'</p><p style="font-size:12px;color:#687480">Nothing on your phone is being deleted or changed while this archive is built.</p>');
}
function loadJSZip(){
  if(window.JSZip)return Promise.resolve(window.JSZip);
  return new Promise((res,rej)=>{
    const old=document.querySelector('script[data-fv-jszip]');
    if(old){
      const wait=()=>window.JSZip?res(window.JSZip):setTimeout(wait,100);wait();return;
    }
    const s=document.createElement('script');s.dataset.fvJszip='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload=()=>window.JSZip?res(window.JSZip):rej(Error('ZIP engine did not load'));
    s.onerror=()=>rej(Error('Could not load ZIP engine'));
    document.head.appendChild(s);
  });
}
async function collectExactPhotos(ids){
  const db=await openPhotosDb();
  const tx=db.transaction('photos','readonly');
  const store=tx.objectStore('photos');
  const all=await req(store.getAll());
  await txDone(tx).catch(()=>{});
  const byId=new Map((all||[]).filter(p=>p&&p.id).map(p=>[String(p.id),p]));
  const rows=[],missing=[];
  for(let i=0;i<ids.length;i++){
    const id=String(ids[i]),p=byId.get(id);
    if(p&&p.blob&&Number(p.blob.size)>0)rows.push(p);else missing.push(id);
  }
  return{rows,missing};
}
async function prepareCleanArchive(){
  const a=activeProjectInfo();
  if(!a.id||!a.p||!a.p.recoveryMaster)throw Error('Open the Recovery Master first.');
  prepared=null;
  modal('Build Clean Recovery Master','<p>Starting clean archive…</p>');
  const rs=JSON.parse(JSON.stringify(currentRecords(a.id)||{}));
  const ncr=JSON.parse(JSON.stringify(currentNcr(a.id)||[]));
  const refs=refsFrom(rs);
  progress(0,refs.length,'Checking linked photos…');
  const found=await collectExactPhotos(refs);
  const JSZip=await loadJSZip();
  const zip=new JSZip();
  const photoIndex=[];
  for(let i=0;i<found.rows.length;i++){
    const p=found.rows[i],ext=extFor(p),path='photos/'+encodeURIComponent(String(p.id))+'.'+ext;
    zip.file(path,p.blob,{binary:true,compression:'STORE'});
    photoIndex.push({...cleanPhotoMeta(p),archivePath:path});
    if(i%4===0){progress(i+1,found.rows.length,'Packing clean photos…');await new Promise(r=>setTimeout(r,0))}
  }
  const manifest={
    type:'fieldverify-clean-recovery-master-archive',
    backupFormat:'FieldVerify Clean Recovery Master Archive',
    cleanArchiveBuild:BUILD,
    created:new Date().toISOString(),
    project:{...(a.p||{}),id:a.id},
    records:rs,
    ncrRows:ncr,
    recoveryMeta:readJson('fieldVerifyRecoveryMasterMeta:'+a.id,null),
    photoIndex,
    archiveManifest:{
      masterId:a.id,
      recordCount:Object.keys(rs).length,
      referencedPhotoIds:refs.length,
      embeddedPhotos:found.rows.length,
      missingPhotoIds:found.missing,
      exactReferencedPhotosOnly:true,
      excludesUnlinkedPhotoRows:true
    }
  };
  zip.file('FieldVerify-Clean-Recovery-Master.json',JSON.stringify(manifest),{compression:'DEFLATE'});
  zip.file('README.txt','FieldVerify Clean Recovery Master archive\nBuild: '+BUILD+'\nRecords: '+Object.keys(rs).length+'\nEmbedded photos: '+found.rows.length+'\nMissing referenced photos: '+found.missing.length+'\n\nThis archive contains only the active Recovery Master records, NCR data, Recovery Master metadata, and photo blobs referenced by that master. Unlinked browser photo rows are intentionally excluded.');
  progress(found.rows.length,found.rows.length,'Creating ZIP file…');
  const blob=await zip.generateAsync({type:'blob',streamFiles:true,compression:'STORE'},m=>{
    const pct=Math.max(0,Math.min(100,Math.round(m.percent||0)));
    setBody('<p style="margin:0 0 10px"><b>Creating ZIP file… '+pct+'%</b></p><div style="height:12px;background:#e7edf4;border-radius:999px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:#16803d"></div></div><p style="font-size:12px;color:#687480">Keep FieldVerify open until the green Save button appears.</p>');
  });
  const filename='FieldVerify-CLEAN-Recovery-Master-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.zip';
  const file=new File([blob],filename,{type:'application/zip'});
  prepared={file,recordCount:Object.keys(rs).length,photoCount:found.rows.length,missing:found.missing};
  setBody('<div style="background:#e7f7ec;border:1px solid #a9d6b5;border-radius:12px;padding:12px;margin-bottom:12px"><b>Clean archive is ready.</b><div style="font-size:13px;margin-top:5px">'+prepared.recordCount+' records · '+prepared.photoCount+' photos · '+prepared.missing.length+' unresolved missing photo reference(s)</div></div><button id="fvCleanSaveNow" style="display:block;width:100%;padding:16px;background:#16803d;color:#fff;border-radius:12px;font-size:18px;font-weight:900">SAVE CLEAN MASTER TO FILES</button><p style="font-size:12px;color:#687480">Tap the green button now. On iPhone choose <b>Save to Files</b> and put it in iCloud Drive or On My iPhone. Nothing is deleted by this step.</p>');
  document.getElementById('fvCleanSaveNow').onclick=savePrepared;
  return prepared;
}
async function savePrepared(){
  if(!prepared||!prepared.file)return;
  const file=prepared.file;
  try{
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      await navigator.share({files:[file],title:'FieldVerify Clean Recovery Master'});
      try{toast('Clean Recovery Master saved/shared')}catch{}
      return;
    }
  }catch(e){
    if(e&&e.name==='AbortError')return;
    console.warn('Native share failed',e);
  }
  const u=URL.createObjectURL(file),a=document.createElement('a');
  a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),60000);
  try{toast('Clean Recovery Master downloaded')}catch{}
}
async function startSave(){
  try{await prepareCleanArchive()}
  catch(e){console.error(e);modal('Clean Archive Error','<div style="background:#fdecec;border:1px solid #e3abab;border-radius:12px;padding:12px"><b>'+(e&&e.message?e.message:String(e))+'</b></div><p style="font-size:12px;color:#687480">No project data was deleted or changed.</p>')}
}
function bind(){
  const backup=document.getElementById('backupBtn'),restore=document.getElementById('restoreBtn');
  if(!(backup||restore)||document.getElementById('fvCleanMasterArchiveBtn'))return;
  const b=document.createElement('button');
  b.id='fvCleanMasterArchiveBtn';
  b.textContent='SAVE CLEAN RECOVERY MASTER';
  b.style.cssText='background:#16803d!important;color:#fff!important;';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();startSave()};
  (backup||restore).insertAdjacentElement('afterend',b);
}
const obs=new MutationObserver(bind);obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(bind,1200);setTimeout(bind,300);
window.FIELDVERIFY_CLEAN_ARCHIVE={build:BUILD,save:startSave,prepare:prepareCleanArchive,savePrepared};
})();