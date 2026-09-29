(()=>{
'use strict';
const BUILD='10.25.90-reliable-transfers';
const SUPABASE_URL='https://xkjmuvrzlsgftvgvazld.supabase.co';
const SUPABASE_KEY='sb_publishable_MxI2bspqc0SmCBrqj8HVqg_IxgpKRvO';
let sb=null,session=null,channel=null,syncReady=false,syncTimer=null,pullTimer=null,initialized=false,transfer=null,syncing=null,rerun=false,downloadBusy=null;
const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uniq=a=>[...new Set((a||[]).filter(Boolean).map(String))];
function html(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function cloudId(){try{const p=typeof activeProject==='function'?activeProject():null;return p?.cloudId||(uuidRe.test(String(activeProjectId||''))?String(activeProjectId):null)}catch{return null}}
function status(t){const b=document.getElementById('fvCloudBtn');if(b)b.textContent=t}
function announce(t){try{toast(t)}catch{};status(t)}
async function loadClient(){if(sb)return sb;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sb=mod.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});session=(await sb.auth.getSession()).data.session;sb.auth.onAuthStateChange((_e,s)=>{session=s;setTimeout(()=>refreshUi().catch(()=>{}),0)});return sb}
function injectUi(){if(document.getElementById('fvCloudBtn'))return;const gps=document.querySelector('.gpsline');if(gps){const b=document.createElement('button');b.id='fvCloudBtn';b.className='badge';b.style.cssText='color:#fff;background:#ffffff22;font-size:12px;font-weight:900';b.textContent='Cloud';b.onclick=showPanel;gps.appendChild(b)}const d=document.createElement('div');d.id='fvCloudModal';d.className='hidden';d.style.cssText='position:fixed;inset:0;z-index:500;background:#0009;padding:18px;overflow:auto';d.innerHTML='<div style="max-width:520px;margin:5vh auto;background:#fff;border-radius:18px;padding:18px;color:#16202a"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 style="margin:0">FieldVerify Cloud</h2><button id="fvCloudClose" style="padding:9px 12px">Close</button></div><div id="fvCloudBody" style="margin-top:14px"></div></div>';document.body.appendChild(d);document.getElementById('fvCloudClose').onclick=()=>d.classList.add('hidden')}
function button(label,id,bg='#083a73'){return `<button id="${id}" style="width:100%;padding:13px;margin:6px 0;background:${bg};color:#fff;border-radius:11px">${label}</button>`}
async function showPanel(){document.getElementById('fvCloudModal')?.classList.remove('hidden');if(!initialized)await init();await refreshUi()}
async function refreshUi(){injectUi();const body=document.getElementById('fvCloudBody');if(!body)return;await loadClient();if(!session){status('Cloud: Sign in');body.innerHTML='<p>Sign in to the shared FieldVerify project.</p><input id="fvEmail" class="field" type="email" placeholder="Email"><input id="fvPass" class="field" type="password" placeholder="Password" style="margin-top:8px">'+button('Sign in','fvSignIn')+button('Create account','fvSignUp','#16803d');document.getElementById('fvSignIn').onclick=authSignIn;document.getElementById('fvSignUp').onclick=authSignUp;return}status(cloudId()?'Cloud: Connected':'Cloud: Signed in');const q=await sb.from('fieldverify_projects').select('*').order('created_at');if(q.error){body.innerHTML=`<p>Cloud error: ${html(q.error.message)}</p>`;return}const rows=q.data||[],current=rows.find(p=>p.id===cloudId());let out=`<p><b>Signed in:</b> ${html(session.user.email||'user')}</p>`;if(current){out+=`<p><b>Shared project:</b> ${html(current.name)}</p>`+button('Sync now','fvSyncNow','#16803d')+button('DOWNLOAD ALL PHOTOS TO DEVICE','fvDownloadPhotos','#16803d')+button('Create / show join code','fvInvite')+button('Sign out','fvSignOut','#666')}else{if(rows.length){out+='<p><b>Your shared projects</b></p>';rows.forEach((p,i)=>out+=button(`Open ${html(p.name)}`,`fvOpen${i}`))}out+=button('Move CURRENT local project to cloud','fvCreateCloud','#16803d')+'<input id="fvJoinCode" class="field" placeholder="Project join code">'+button('Join project','fvJoin')}body.innerHTML=out;if(current){document.getElementById('fvSyncNow').onclick=()=>syncAll(true).catch(e=>announce(e.message));document.getElementById('fvDownloadPhotos').onclick=()=>downloadPhotos().catch(e=>announce(e.message));document.getElementById('fvInvite').onclick=createInvite;document.getElementById('fvSignOut').onclick=async()=>{await sb.auth.signOut();session=null;syncReady=false;refreshUi()}}else{rows.forEach((p,i)=>{const el=document.getElementById(`fvOpen${i}`);if(el)el.onclick=()=>activateRemoteProject(p)});document.getElementById('fvCreateCloud').onclick=createCloudFromCurrent;document.getElementById('fvJoin').onclick=joinProject}}
async function authSignIn(){const email=document.getElementById('fvEmail').value.trim(),password=document.getElementById('fvPass').value;if(!email||!password)return announce('Enter email and password');const r=await sb.auth.signInWithPassword({email,password});if(r.error)return announce(`Sign in failed: ${r.error.message}`);session=r.data.session;await refreshUi();await autoConnect()}
async function authSignUp(){const email=document.getElementById('fvEmail').value.trim(),password=document.getElementById('fvPass').value;if(!email||password.length<6)return announce('Use a password of at least 6 characters');const r=await sb.auth.signUp({email,password});if(r.error)return announce(`Account failed: ${r.error.message}`);session=r.data.session||null;await refreshUi()}
function rowFromRecord(pid,key,r){return{project_id:pid,item_key:String(key),item_type:r.itemType||'Caisson',item_label:r.itemLabel||'',status:r.status||'No information',verified:!!r.verified,notes:r.notes||'',lat:r.lat??null,lon:r.lon??null,condition:r.condition||'',pickup_time:r.pickupTime||null,unload_time:r.unloadTime||null,pickup_gps:r.pickupGPS||null,unload_gps:r.unloadGPS||null,inspection:r.inspection||{},history:r.history||[],updated_at:r.updated||new Date().toISOString()}}
function recFromRow(x,old={}){return{...old,itemType:x.item_type||'Caisson',itemLabel:x.item_label||'',status:x.status||'No information',verified:!!x.verified,notes:x.notes||'',lat:x.lat,lon:x.lon,condition:x.condition||'',pickupTime:x.pickup_time,unloadTime:x.unload_time,pickupGPS:x.pickup_gps,unloadGPS:x.unload_gps,inspection:x.inspection||{},history:x.history||[],updated:x.updated_at}}
async function pullMetadata(showToast=false){const pid=cloudId();if(!pid||!session)return;const local=activeProjectId,rows=await remoteRows('fieldverify_records','*',pid,'item_key');if(local!==activeProjectId||pid!==cloudId())return;for(const x of rows){const old=records[x.item_key]||{},lt=Date.parse(old.updated||0)||0,rt=Date.parse(x.updated_at||0)||0;if(rt>=lt)records[x.item_key]=recFromRow(x,old)}const st=await sb.from('fieldverify_project_state').select('*').eq('project_id',pid).maybeSingle();if(local!==activeProjectId||pid!==cloudId())return;if(!st.error&&st.data&&Array.isArray(st.data.ncr_rows)&&!ncrRows.length)ncrRows=st.data.ncr_rows;const photoRows=await remoteRows('fieldverify_photos','id,item_key',pid);if(local!==activeProjectId||pid!==cloudId())return;for(const m of photoRows){const key=String(m.item_key),r=records[key]||defaultRec();records[key]={...r,photos:uniq([...(r.photos||[]),String(m.id)])}}try{localStorage.setItem(projectRecordsKey(),JSON.stringify(records));localStorage.setItem(projectNcrKey(),JSON.stringify(ncrRows));if(activeProjectId==='legacy'){localStorage.setItem(NEW_KEY,JSON.stringify(records));localStorage.setItem(NCR_KEY,JSON.stringify(ncrRows))}}catch(e){throw Error('Cloud metadata could not be saved on this device: '+e.message)}try{renderPins()}catch{};if(showToast)announce('Cloud synced · photos load only when needed')}
async function pushRecords(){const pid=cloudId();if(!pid||!session)return;const local=activeProjectId;const rows=Object.entries(records||{}).map(([k,r])=>rowFromRecord(pid,k,r));for(let i=0;i<rows.length;i+=50){if(local!==activeProjectId||pid!==cloudId())throw Error('Project changed; sync paused');const r=await sb.from('fieldverify_records').upsert(rows.slice(i,i+50),{onConflict:'project_id,item_key'});if(r.error)throw r.error}}
async function pushState(){const pid=cloudId();if(!pid||!session)return;const existing=await sb.from('fieldverify_project_state').select('*').eq('project_id',pid).maybeSingle();if(existing.error)throw existing.error;if(!ncrRows.length&&existing.data?.ncr_rows?.length)return;if(pid!==cloudId())throw Error('Project changed');const r=await sb.from('fieldverify_project_state').upsert({project_id:pid,ncr_rows:Array.isArray(ncrRows)?ncrRows:[],settings:{activeLocalProjectId:activeProjectId},updated_at:new Date().toISOString()},{onConflict:'project_id'});if(r.error)throw r.error}
function dbReq(req){return new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function getLocalPhoto(id){const db=await openDB();try{const tx=db.transaction('photos','readonly'),done=txDone(tx),q=dbReq(tx.objectStore('photos').get(String(id)));const v=await q;await done;return v}finally{db.close()}}
async function putLocalPhoto(row){const db=await openDB();try{const tx=db.transaction('photos','readwrite'),done=txDone(tx);tx.objectStore('photos').put(row);await done}finally{db.close()}}
function context(){return{pid:cloudId(),local:activeProjectId}}
function current(c){return c.pid===cloudId()&&c.local===activeProjectId&&!!session}
async function remoteRows(table,fields,pid,order='id'){const rows=[];for(let offset=0;;offset+=200){const q=await sb.from(table).select(fields).eq('project_id',pid).order(order).range(offset,offset+199);if(q.error)throw q.error;rows.push(...(q.data||[]));if((q.data||[]).length<200)return rows}}
async function keepAwake(){try{return await navigator.wakeLock?.request('screen')}catch{return null}}
function extFor(p){const t=String(p?.type||p?.blob?.type||'').toLowerCase();if(t.includes('png'))return'png';if(t.includes('webp'))return'webp';return'jpg'}
async function pushPhotos(){
 if(transfer)return transfer;
 transfer=(async()=>{const c=context();if(!c.pid||!session)throw Error('Sign in and connect this project to Cloud first');
 const refs=uniq(Object.values(records||{}).flatMap(r=>r?.photos||[])),remote=await remoteRows('fieldverify_photos','id',c.pid),have=new Set(remote.map(x=>String(x.id)));
 let uploaded=0,missing=0;const failed=[];const wake=await keepAwake();
 try{for(const id of refs){if(!current(c))throw Error('Project changed; transfer paused');if(have.has(id))continue;
 const p=await getLocalPhoto(id);if(!p?.blob?.size){missing++;continue}
 try{const item=String(p.caisson??p.number??'unknown'),path=`${c.pid}/${encodeURIComponent(item)}/${encodeURIComponent(id)}.${extFor(p)}`;
 status(`Cloud: uploading ${uploaded+1} / ${refs.length-have.size}`);
 const up=await sb.storage.from('fieldverify').upload(path,p.blob,{upsert:false,contentType:p.type||p.blob.type||'image/jpeg'});
 if(up.error){if(!/already exists|duplicate/i.test(up.error.message||''))throw up.error;const check=await sb.storage.from('fieldverify').download(path);if(check.error||!check.data?.size)throw check.error||Error('Cloud file is empty')}
 if(!current(c))throw Error('Project changed; transfer paused');
 const meta=await sb.from('fieldverify_photos').upsert({id,project_id:c.pid,item_key:item,storage_path:path,file_name:p.name||'',mime_type:p.type||p.blob.type||'',captured_at:p.date||null},{onConflict:'id'});if(meta.error)throw meta.error;uploaded++;
 }catch(e){failed.push({id,message:e.message||String(e)})}
 await new Promise(r=>setTimeout(r,0));}
 return{uploaded,missing,failed,total:refs.length};
 }finally{await wake?.release().catch(()=>{})}})();
 try{return await transfer}finally{transfer=null}
}
async function downloadPhotos(ids=null){
 if(downloadBusy)return downloadBusy;
 downloadBusy=(async()=>{await init();const c=context();if(!c.pid||!session)throw Error('Sign in and connect this project first');
 if(!ids)localStorage.setItem('fieldVerifyDownloadPending:'+c.local,'1');const meta=await remoteRows('fieldverify_photos','*',c.pid),wanted=ids?new Set(ids.map(String)):null;let saved=0,cached=0;const failed=[];const wake=await keepAwake();
 try{for(const m of meta){if(wanted&&!wanted.has(String(m.id)))continue;if(!current(c))throw Error('Project changed; download paused');
 try{const p=await getLocalPhoto(m.id);if(p?.blob?.size){cached++;continue}status(`Cloud: downloading ${saved+cached+1} / ${wanted?wanted.size:meta.length}`);
 const dl=await sb.storage.from('fieldverify').download(m.storage_path);if(dl.error||!dl.data?.size)throw dl.error||Error('Cloud photo file is empty');
 if(!current(c))throw Error('Project changed; download paused');
 await putLocalPhoto({id:String(m.id),caisson:m.item_key,projectId:c.local,name:m.file_name||'',type:m.mime_type||dl.data.type,date:m.captured_at,blob:dl.data});saved++;
 }catch(e){failed.push({id:m.id,message:e.message||String(e)})}
 await new Promise(r=>setTimeout(r,0));}
 const result={saved,cached,failed,total:wanted?wanted.size:meta.length};
 if(!ids&&!failed.length)localStorage.removeItem('fieldVerifyDownloadPending:'+c.local);status(failed.length?`Cloud: ${failed.length} photos need retry`:`Cloud: ${saved+cached} photos on device`);return result;
 }finally{await wake?.release().catch(()=>{})}})();
 try{return await downloadBusy}finally{downloadBusy=null}
}
async function syncAll(showToast=false,opt={}){
 if(syncing){rerun=true;return syncing}if(!session||!cloudId()||!navigator.onLine)return;
 syncing=(async()=>{const c=context();try{syncReady=false;if(!opt.bootstrap)await pullMetadata(false);if(!current(c))throw Error('Project changed; sync paused');await pushRecords();if(!current(c))throw Error('Project changed; sync paused');await pushState();const result=await pushPhotos();
 if(result.failed.length||result.missing){status(`Cloud: ${result.failed.length} failed · ${result.missing} unavailable on device`);if(showToast)announce(`Cloud: ${result.uploaded} uploaded; ${result.failed.length} failed; ${result.missing} photos unavailable on this device`)}else status('Cloud: All linked photos synced');return result;
 }catch(e){console.error('FieldVerify cloud sync',e);status(`Cloud: ${e.message||e}`);throw e}finally{syncReady=true}})();
 try{return await syncing}finally{syncing=null;if(rerun){rerun=false;queueSync()}}
}
function queueSync(){if(!syncReady||!session||!cloudId())return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncAll(false).catch(console.error),3000)}
function queuePull(){clearTimeout(pullTimer);pullTimer=setTimeout(()=>pullMetadata(false).catch(console.error),1500)}
async function subscribe(pid){if(channel){try{await sb.removeChannel(channel)}catch{}}channel=sb.channel(`fieldverify-${pid}`).on('postgres_changes',{event:'*',schema:'public',table:'fieldverify_records',filter:`project_id=eq.${pid}`},queuePull).on('postgres_changes',{event:'*',schema:'public',table:'fieldverify_project_state',filter:`project_id=eq.${pid}`},queuePull).on('postgres_changes',{event:'*',schema:'public',table:'fieldverify_photos',filter:`project_id=eq.${pid}`},queuePull).subscribe()}
function wrapLocalWrites(){if(window.__fvCloudWrapped)return;window.__fvCloudWrapped=true;const p0=persist;persist=function(){p0();queueSync()};const n0=persistNcr;persistNcr=function(){n0();queueSync()};const s0=savePhotos;savePhotos=async function(n,files){await s0(n,files);queueSync()}}
async function autoConnect(){if(!session)return;const pid=cloudId();if(pid){const q=await sb.from('fieldverify_projects').select('*').eq('id',pid).maybeSingle();if(!q.error&&q.data){syncReady=false;await pullMetadata(false);syncReady=true;await subscribe(pid);status('Cloud: Connected');queueSync();if(localStorage.getItem('fieldVerifyDownloadPending:'+activeProjectId))setTimeout(()=>downloadPhotos().catch(console.error),0);return}}const q=await sb.from('fieldverify_projects').select('*').order('created_at');if(!q.error&&(q.data||[]).length===1)await activateRemoteProject(q.data[0])}
async function createCloudFromCurrent(){if(!session)return;const p=activeProject();if(!p)return;const q=await sb.from('fieldverify_projects').insert({name:p.name||'FieldVerify Project',project_number:p.number||'',address:p.address||'',client:p.client||'',drawing_revision:p.drawingRevision||''}).select().single();if(q.error)return announce(`Cloud project failed: ${q.error.message}`);const idx=projects.findIndex(x=>x.id===activeProjectId);if(idx>=0)projects[idx]={...projects[idx],cloudId:q.data.id};saveProjects();await syncAll(true,{bootstrap:true});await subscribe(q.data.id);await refreshUi()}
async function activateRemoteProject(p){let local=projects.find(x=>x.cloudId===p.id||x.id===p.id);if(!local){local={id:p.id,cloudId:p.id,name:p.name,number:p.project_number||'',address:p.address||'',client:p.client||'',drawingRevision:p.drawing_revision||'',created:p.created_at};projects.push(local)}activeProjectId=local.id;saveProjects();loadRecords();syncReady=false;await pullMetadata(true);syncReady=true;await subscribe(p.id);refreshUi()}
async function joinProject(){const code=document.getElementById('fvJoinCode')?.value.trim();if(!code)return;const r=await sb.rpc('fieldverify_join_project',{join_code:code});if(r.error)return announce(`Join failed: ${r.error.message}`);const q=await sb.from('fieldverify_projects').select('*').eq('id',r.data).single();if(q.error)return announce(`Join failed: ${q.error.message}`);await activateRemoteProject(q.data)}
async function createInvite(){const pid=cloudId();if(!pid)return;const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);const code=[...bytes].map(x=>(x%36).toString(36)).join('').toUpperCase();const r=await sb.from('fieldverify_project_invites').insert({project_id:pid,code,role:'member',uses_remaining:50}).select().single();if(r.error)return announce(`Code failed: ${r.error.message}`);document.getElementById('fvCloudBody').innerHTML+=`<div style="margin-top:12px;padding:14px;background:#eef3f8;border-radius:12px;text-align:center"><div class="tiny">PROJECT JOIN CODE</div><div style="font-size:32px;font-weight:900;letter-spacing:3px">${html(code)}</div></div>`}
async function init(){if(initialized)return;initialized=true;injectUi();wrapLocalWrites();try{await loadClient();if(session)await autoConnect();else status('Cloud: Sign in')}catch(e){console.error(e);status('Cloud: Offline')}}
async function startup(){
 injectUi();
 status('Cloud: Connecting…');
 try{
  await init();
  if(session&&cloudId()){
   status('Cloud: Connected');
   setTimeout(()=>{try{window.FIELDVERIFY_CLOUD_PHOTO_UPLOAD_FIX?.run?.()}catch{}},800);
  }else if(!session){
   status('Cloud: Sign in');
  }else{
   status('Cloud: Signed in');
  }
 }catch(e){
  console.warn('FieldVerify automatic Cloud connect',e);
  status(navigator.onLine?'Cloud: Check failed':'Cloud: Offline');
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});else startup();
addEventListener('online',()=>{autoConnect().then(queueSync).catch(console.error)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoConnect().then(queueSync).catch(console.error)});
window.FIELDVERIFY_CLOUD_SYNC={build:BUILD,downloadPhotos,uploadPhotos:pushPhotos,client:loadClient,sync:async()=>{await init();return syncAll(true)},pullMetadata:async()=>{await init();return pullMetadata(true)},init};
})();

