/* FieldVerify Pro v10.25.44 - memory-safe on-demand cloud photo loader */
(()=>{
'use strict';
const VERSION='10.25.44-cloud-photo-on-demand';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
let sb=null,running=false,lastKey='';
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function cloudId(){try{const p=typeof activeProject==='function'?activeProject():null;return p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):'')}catch{return''}}
async function client(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
function req(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function hasPhoto(id){if(typeof openDB!=='function')return false;const db=await openDB(),tx=db.transaction('photos','readonly'),v=await req(tx.objectStore('photos').get(String(id)));await done(tx);return !!v?.blob?.size}
async function save(meta,blob){if(typeof openDB!=='function'||!blob?.size)return;const db=await openDB(),tx=db.transaction('photos','readwrite');tx.objectStore('photos').put({id:String(meta.id),caisson:meta.item_key,name:meta.file_name||String(meta.id),type:meta.mime_type||blob.type||'image/jpeg',blob,date:meta.captured_at||meta.created_at,projectId:typeof activeProjectId!=='undefined'?activeProjectId:null});await done(tx)}
async function loadSelected(force=false){const pid=cloudId(),key=(typeof selected!=='undefined'&&selected!=null)?String(selected):'';if(!pid||!key||!navigator.onLine||running)return 0;if(!force&&key===lastKey)return 0;running=true;lastKey=key;try{const c=await client(),session=(await c.auth.getSession()).data.session;if(!session)return 0;const q=await c.from('fieldverify_photos').select('id,item_key,storage_path,file_name,mime_type,captured_at,created_at').eq('project_id',pid).eq('item_key',key);if(q.error)throw q.error;let saved=0;for(const m of (q.data||[]).slice(0,20)){if(await hasPhoto(m.id))continue;const dl=await c.storage.from('fieldverify').download(m.storage_path);if(!dl.error&&dl.data?.size){await save(m,dl.data);saved++;await new Promise(r=>setTimeout(r,30))}}if(saved){try{if(typeof showTarget==='function')showTarget()}catch{};try{toast(`${saved} photo${saved===1?'':'s'} loaded for this item`)}catch{}}return saved}catch(e){console.warn('Selected cloud photo load',e);return 0}finally{running=false}}
/* IMPORTANT: no startup, visibility, online, or project-wide photo downloads. */
document.addEventListener('click',e=>{if(e.target?.closest?.('.pin'))setTimeout(()=>loadSelected(false),250)},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('#photoBtn,#libraryBtn,#fvCloudBtn'))setTimeout(()=>loadSelected(false),250)},true);
window.FIELDVERIFY_CLOUD_PHOTO_ACCELERATOR={version:VERSION,run:()=>loadSelected(true),loadSelected};
console.info(`FieldVerify cloud photos ${VERSION} loaded`);
})();
