(()=>{
'use strict';
const VERSION='10.25.64-cloud-sync-verify';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let client=null,busy=false;
const uniq=a=>[...new Set((a||[]).filter(Boolean).map(String))];
function say(t){try{toast(t)}catch{}const b=document.getElementById('fvCloudBtn');if(b)b.textContent=t}
function projectId(){try{const p=typeof activeProject==='function'?activeProject():null;if(p?.cloudId)return String(p.cloudId)}catch{}try{if(UUID.test(String(activeProjectId||'')))return String(activeProjectId)}catch{}return null}
function localSnapshot(){const rows=Object.keys(typeof records==='object'&&records?records:{}).map(String);const photos=uniq(Object.values(typeof records==='object'&&records?records:{}).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]));return{rows,photos}}
async function sb(){return window.FIELDVERIFY_CLOUD_SYNC.client()}
function note(text,bad=false){const body=document.getElementById('fvCloudBody');if(!body)return;let p=document.getElementById('fvSyncVerifyNote');if(!p){p=document.createElement('p');p.id='fvSyncVerifyNote';p.className='tiny';const btn=document.getElementById('fvSyncNow');if(btn)btn.insertAdjacentElement('afterend',p);else body.appendChild(p)}p.style.cssText=`margin:7px 0 10px;padding:9px;border-radius:9px;background:${bad?'#fff0ef':'#eef8f1'};color:${bad?'#a51d17':'#12642f'};font-weight:800`;p.textContent=text}
async function remoteSnapshot(c,pid){async function rows(table,fields,key){const all=[];for(let offset=0;;offset+=200){const q=await c.from(table).select(fields).eq('project_id',pid).order(key).range(offset,offset+199);if(q.error)throw q.error;all.push(...q.data);if(q.data.length<200)return all}}const rr=await rows('fieldverify_records','item_key','item_key'),pr=await rows('fieldverify_photos','id','id');return{rows:uniq(rr.map(x=>x.item_key)),photos:uniq(pr.map(x=>x.id))}}
function compare(local,remote){const rset=new Set(remote.rows),pset=new Set(remote.photos);return{missingRows:local.rows.filter(x=>!rset.has(x)),missingPhotos:local.photos.filter(x=>!pset.has(x))}}
async function verifiedSync(btn){
 if(busy)return;busy=true;const old=btn?.textContent||'Sync now';if(btn){btn.disabled=true;btn.textContent='CHECKING / SYNCING…'}
 try{
  const c=await sb(),session=(await c.auth.getSession()).data.session;if(!session){note('Sign in to FieldVerify Cloud first.',true);say('Cloud: Sign in');return}
  const pid=projectId();if(!pid){note('This current project is not connected to Cloud yet.',true);say('Cloud: not connected');return}
  if(!navigator.onLine){note('This device is offline. Cloud sync will resume when you have a connection.',true);say('Cloud: Offline');return}
  const before=localSnapshot();
  note(`Syncing ${before.rows.length} local record${before.rows.length===1?'':'s'} and checking ${before.photos.length} photo link${before.photos.length===1?'':'s'}…`);
  const result=await window.FIELDVERIFY_CLOUD_SYNC.sync();if(result?.failed?.length||result?.missing)throw Error(`${result.failed.length} uploads failed; ${result.missing} photos unavailable on this device`);
  const remote=await remoteSnapshot(c,pid),diff=compare(before,remote);
  if(!diff.missingRows.length&&!diff.missingPhotos.length){
    const msg=`Cloud is up to date — ${remote.rows.length} record${remote.rows.length===1?'':'s'} and ${remote.photos.length} photo${remote.photos.length===1?'':'s'} are loaded.`;
    note(msg);say('Cloud: Up to date');
  }else{
    const parts=[];if(diff.missingRows.length)parts.push(`${diff.missingRows.length} record${diff.missingRows.length===1?'':'s'} still pending`);if(diff.missingPhotos.length)parts.push(`${diff.missingPhotos.length} photo${diff.missingPhotos.length===1?'':'s'} still pending`);
    note(`Cloud sync is partially complete: ${remote.rows.length}/${before.rows.length} records and ${remote.photos.length}/${before.photos.length} photos are stored in Cloud. ${parts.join(' · ')}. Keep the app open or tap Sync now to retry pending transfers.`,true);say('Cloud: Sync incomplete');
  }
 }catch(e){
  console.warn('Verified Cloud sync',e);note(`Cloud check failed: ${e?.message||e}`,true);say('Cloud: Check failed')
 }finally{busy=false;if(btn){btn.disabled=false;btn.textContent=old}}
}
function enhance(){const b=document.getElementById('fvSyncNow');if(b&&!document.getElementById('fvSyncVerifyNote'))note('Sync checks the Cloud after it runs, so “already loaded” data will be reported as up to date instead of as an error.')}
document.addEventListener('click',e=>{const b=e.target?.closest?.('#fvSyncNow');if(!b)return;e.preventDefault();e.stopImmediatePropagation();verifiedSync(b)},true);
const obs=new MutationObserver(()=>enhance());obs.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
window.FIELDVERIFY_CLOUD_VERIFY={version:VERSION,run:()=>verifiedSync(document.getElementById('fvSyncNow'))};
console.info(`FieldVerify ${VERSION} loaded`);
})();

