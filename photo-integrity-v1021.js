(()=>{
  'use strict';
  const BUILD='10.21';
  const unique=v=>[...new Set((v||[]).filter(Boolean).map(String))];
  const photoNumber=p=>p?.caisson ?? p?.number ?? p?.itemNumber ?? p?.item ?? null;
  const validData=v=>typeof v==='string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(v) && v.length>64;

  async function allStoredPhotos(){
    const db=await openDB();
    return await allFromStore(db,'photos');
  }

  function recordPhotoIds(source=records){
    return unique(Object.values(source||{}).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]));
  }

  function eligibleStoredPhotos(stored,source=records){
    const keys=new Set(Object.keys(source||{}).map(String));
    const active=typeof activeProjectId!=='undefined'?String(activeProjectId||'legacy'):'legacy';
    return (stored||[]).filter(p=>{
      if(!p?.id||!p?.blob)return false;
      if(p.projectId!=null)return String(p.projectId)===active;
      const n=photoNumber(p);
      return active==='legacy' || (n!=null && keys.has(String(n)));
    });
  }

  async function repairLinksFromDevice(){
    let stored=[];
    try{stored=await allStoredPhotos()}catch(err){console.warn('Photo integrity scan failed',err);return {stored:[],repaired:0};}
    const eligible=eligibleStoredPhotos(stored,records);
    const byNumber=new Map();
    for(const p of eligible){
      const n=photoNumber(p); if(n==null)continue;
      const k=String(n); if(!byNumber.has(k))byNumber.set(k,[]); byNumber.get(k).push(String(p.id));
    }
    let repaired=0;
    for(const [n,ids] of byNumber){
      if(!records?.[n])continue;
      const before=unique(records[n].photos);
      const after=unique([...before,...ids]);
      if(after.length!==before.length){records[n]={...records[n],photos:after};repaired+=after.length-before.length;}
    }
    if(repaired && typeof persist==='function')persist();
    return {stored:eligible,repaired};
  }

  async function auditPhotoState(){
    const {stored,repaired}=await repairLinksFromDevice();
    const refs=recordPhotoIds(records);
    const storedIds=new Set(stored.map(p=>String(p.id)));
    const missing=refs.filter(id=>!storedIds.has(id));
    return {refs:refs.length,stored:stored.length,missing,repaired};
  }

  // Mark newly saved photo rows with the active project so future backups can never
  // confuse two projects that happen to use the same caisson/item number.
  if(typeof savePhotos==='function'){
    const previousSavePhotos=savePhotos;
    savePhotos=async function photoIntegritySavePhotos(n,files){
      const result=await previousSavePhotos.apply(this,arguments);
      try{
        const ids=unique(records?.[String(n)]?.photos);
        const active=typeof activeProjectId!=='undefined'?String(activeProjectId||'legacy'):'legacy';
        const db=await openDB();
        const tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos');
        for(const id of ids){
          const req=store.get(id);
          req.onsuccess=()=>{const row=req.result;if(row && row.projectId==null)store.put({...row,projectId:active});};
        }
        await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
      }catch(err){console.warn('Could not stamp photo project ID',err);}
      return result;
    };
  }

  // Final safety wrapper: a project backup must carry actual image bytes for every
  // photo blob currently available on this device, even if an old record link was lost.
  if(typeof buildProjectBackup==='function'){
    const previousBuildProjectBackup=buildProjectBackup;
    buildProjectBackup=async function integrityBuildProjectBackup(){
      const audit=await auditPhotoState();
      const result=await previousBuildProjectBackup.apply(this,arguments);
      const payload=result?.payload||{};
      const stored=eligibleStoredPhotos(await allStoredPhotos(),payload.records||records);
      const map=new Map((Array.isArray(payload.photos)?payload.photos:[]).filter(p=>p?.id&&validData(p.data)).map(p=>[String(p.id),p]));
      const encodeFailed=[];
      for(const p of stored){
        const id=String(p.id); if(map.has(id))continue;
        try{map.set(id,{...p,blob:undefined,data:await blobToDataURL(p.blob)});}catch{encodeFailed.push(id);}
      }
      payload.photos=[...map.values()].filter(p=>p?.id&&validData(p.data));
      const embedded=new Set(payload.photos.map(p=>String(p.id)));
      const refs=recordPhotoIds(payload.records||records);
      const missingRefs=refs.filter(id=>!embedded.has(id));
      payload.photoIntegrity={
        build:BUILD,
        checkedAt:new Date().toISOString(),
        referenced:refs.length,
        devicePhotoBlobs:stored.length,
        embedded:payload.photos.length,
        missingReferencedIds:missingRefs,
        encodeFailedIds:encodeFailed,
        complete:missingRefs.length===0 && encodeFailed.length===0
      };
      result.payload=payload;
      result.photos=payload.photos;
      result.missingPhotoIds=missingRefs;
      result.photoIntegrity=payload.photoIntegrity;
      return result;
    };
  }

  // Never silently label an incomplete project backup as successful.
  if(typeof backupProject==='function'){
    backupProject=async function integrityBackupProject(){
      try{
        const result=await buildProjectBackup();
        const info=result.photoIntegrity||result.payload?.photoIntegrity||{};
        const incomplete=(info.missingReferencedIds||[]).length+(info.encodeFailedIds||[]).length;
        const file=new File([JSON.stringify(result.payload)],`FieldVerify-Pro-Photo-Safe-Backup-${new Date().toISOString().slice(0,10)}${incomplete?'-INCOMPLETE':''}.json`,{type:'application/json'});
        downloadFile(file);
        if(incomplete){
          const msg=`BACKUP WARNING: ${result.photos?.length||0} actual photos embedded, but ${incomplete} older referenced photo${incomplete===1?' is':'s are'} not stored on this device. The backup was marked INCOMPLETE.`;
          if(typeof toast==='function')toast(msg);
          setTimeout(()=>{try{alert(msg)}catch{}},100);
        }else if(typeof toast==='function'){
          toast(`PHOTO-SAFE BACKUP VERIFIED: ${Object.keys(records||{}).length} records · ${result.photos?.length||0} actual photos embedded`);
        }
      }catch(err){if(typeof toast==='function')toast(`Backup failed: ${err.message||err}`);}
    };
  }

  // Office reports get a fresh device scan first, so orphaned but still-present blobs
  // are relinked before PDF generation. Missing historical blobs are reported visibly.
  if(typeof shareOfficeReport==='function'){
    const previousShareOfficeReport=shareOfficeReport;
    shareOfficeReport=async function integrityShareOfficeReport(){
      try{
        const audit=await auditPhotoState();
        if(typeof toast==='function'){
          if(audit.missing.length)toast(`PDF photo check: ${audit.stored} actual photos available · ${audit.missing.length} older referenced photos missing from this device`);
          else toast(`PDF photo check verified: ${audit.stored} actual photos available`);
        }
      }catch(err){console.warn('Office PDF photo audit failed',err);}
      return await previousShareOfficeReport.apply(this,arguments);
    };
  }

  window.FieldVerifyPhotoIntegrity={audit:auditPhotoState,repair:repairLinksFromDevice,version:BUILD};
  setTimeout(()=>auditPhotoState().catch(()=>{}),900);
})();
