(()=>{
'use strict';
const VERSION='10.25.18-photo-upload-fix-1';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let sb=null,busy=false,lastRun=0;
function say(s){try{toast(s)}catch{};const b=document.getElementById('fvCloudBtn');if(b)b.textContent=s}
function pid(){try{const p=typeof activeProject==='function'?activeProject():null;const id=p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):'');return id||''}catch{return''}}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function localPhotos(){if(typeof openDB!=='function')return[];const db=await openDB(),tx=db.transaction('photos','readonly'),rows=await req(tx.objectStore('photos').getAll());await done(tx);return rows||[]}
function mime(p){let t=String(p?.type||p?.blob?.type||'').toLowerCase();if(!t){const n=String(p?.name||'').toLowerCase();if(/\.hei[cf]$/.test(n))t=n.endsWith('.heif')?'image/heif':'image/heic';else if(n.endsWith('.png'))t='image/png';else if(n.endsWith('.webp'))t='image/webp';else t='image/jpeg'}return t}
function ext(t){if(t.includes('heic'))return'heic';if(t.includes('heif'))return'heif';if(t.includes('png'))return'png';if(t.includes('webp'))return'webp';return'jpg'}
async function bodyFor(blob,type){if(!blob)throw Error('Photo content is missing on this device');let ab;if(typeof blob.arrayBuffer==='function')ab=await blob.arrayBuffer();else ab=await new Response(blob).arrayBuffer();if(!ab||!ab.byteLength)throw Error('Photo has zero bytes on this device');return new Blob([new Uint8Array(ab)],{type:type||blob.type||'application/octet-stream'})}
async function uploadMissing(show=true){
 const id=pid();if(!id||!navigator.onLine||busy)return 0;busy=true;lastRun=Date.now();
 try{
  const c=await client(),session=(await c.auth.getSession()).data.session;if(!session)throw Error('Sign in to FieldVerify Cloud first');
  const refs=new Set(Object.values(typeof records==='object'&&records||{}).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]).map(String));
  const rows=(await localPhotos()).filter(p=>p?.id&&p?.blob&&refs.has(String(p.id)));
  const q=await c.from('fieldverify_photos').select('id').eq('project_id',id);if(q.error)throw q.error;
  const remote=new Set((q.data||[]).map(x=>String(x.id))),pending=rows.filter(p=>!remote.has(String(p.id)));
  if(!pending.length){if(show)say('Cloud: photos already synced');return 0}
  let uploaded=0;
  for(const p of pending){
   const t=mime(p),body=await bodyFor(p.blob,t),item=String(p.caisson??p.number??'unknown'),path=`${id}/${encodeURIComponent(item)}/${encodeURIComponent(String(p.id))}.${ext(t)}`;
   say(`Cloud: uploading photo ${uploaded+1}/${pending.length}`);
   const up=await c.storage.from('fieldverify').upload(path,body,{upsert:true,contentType:t,cacheControl:'3600'});if(up.error)throw up.error;
   const meta=await c.from('fieldverify_photos').upsert({id:String(p.id),project_id:id,item_key:item,storage_path:path,file_name:p.name||'',mime_type:t,captured_at:p.date||new Date().toISOString(),lat:p.lat??null,lon:p.lon??null,metadata:{materializedUpload:true,source:'ios-safe-upload'}},{onConflict:'id'});if(meta.error)throw meta.error;
   uploaded++;
  }
  if(show)say(`Cloud: ${uploaded} photo${uploaded===1?'':'s'} uploaded`);
  return uploaded;
 }catch(e){console.error('FieldVerify robust photo upload',e);if(show)say(`Cloud photo upload failed: ${e.message||e}`);throw e}finally{busy=false}
}
async function prepareThen(original,ctx,args){try{await uploadMissing(true)}catch{return}return original?.apply(ctx,args||[])}
function wrapHosted(){const h=window.FIELDVERIFY_HOSTED_BACKUP;if(!h||h.__fvPhotoSafe)return false;h.__fvPhotoSafe=true;if(typeof h.backup==='function'){const old=h.backup;h.backup=function(...a){return prepareThen(old,h,a)}}if(typeof h.autosave==='function'){const old=h.autosave;h.autosave=function(...a){return prepareThen(old,h,a)}}return true}
function hookSyncButton(e){const b=e.target?.closest?.('#fvSyncNow');if(!b||b.dataset.fvPhotoSafeBusy==='1')return;const old=b.onclick;if(typeof old!=='function')return;e.preventDefault();e.stopImmediatePropagation();b.dataset.fvPhotoSafeBusy='1';const txt=b.textContent;b.disabled=true;b.textContent='Uploading photos…';(async()=>{try{await uploadMissing(true);b.disabled=false;b.textContent=txt;await old.call(b,e)}catch{}finally{b.disabled=false;b.textContent=txt;delete b.dataset.fvPhotoSafeBusy}})()}
function wrapSavePhotos(){try{if(window.__fvPhotoUploadSaveWrapped||typeof savePhotos!=='function')return;window.__fvPhotoUploadSaveWrapped=true;const old=savePhotos;savePhotos=async function(...a){const r=await old.apply(this,a);setTimeout(()=>uploadMissing(false).catch(()=>{}),100);return r}}catch{}}
document.addEventListener('click',hookSyncButton,true);
addEventListener('online',()=>uploadMissing(false).catch(()=>{}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRun>5000)uploadMissing(false).catch(()=>{})});
setInterval(()=>{wrapHosted();wrapSavePhotos()},1000);
setTimeout(()=>{wrapHosted();wrapSavePhotos();uploadMissing(false).catch(()=>{})},1200);
window.FIELDVERIFY_CLOUD_PHOTO_UPLOAD_FIX={version:VERSION,run:()=>uploadMissing(true)};
console.info(`FieldVerify cloud photo upload fix ${VERSION} loaded`);
})();
