(()=>{
'use strict';
const BUILD='10.25.86-recent-photo-rescue';
const ACTIVE='fieldVerifyActiveProject',PROJECTS='fieldVerifyProjects';
const HOURS=24;
const $=id=>document.getElementById(id);
const uniq=a=>[...new Set((a||[]).filter(Boolean).map(String))];
function read(k,f){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch{return f}}
function active(){
  const id=localStorage.getItem(ACTIVE)||'';
  const ps=read(PROJECTS,[]);
  const p=(Array.isArray(ps)?ps:[]).find(x=>String(x?.id||'')===id);
  return{id,p};
}
function recordsFor(id){
  try{if(typeof activeProjectId!=='undefined'&&String(activeProjectId)===String(id)&&typeof records==='object')return records||{}}catch{}
  const v=read('fieldVerifyProjectRecords:'+id,{});
  return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
}
function saveRecords(id,rs){
  localStorage.setItem('fieldVerifyProjectRecords:'+id,JSON.stringify(rs));
  try{
    if(typeof activeProjectId!=='undefined'&&String(activeProjectId)===String(id)){
      records=rs;
      if(typeof persist==='function')persist();
    }
  }catch{}
}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
async function openPhotoDb(){if(typeof openDB==='function')return openDB();return new Promise((res,rej)=>{const q=indexedDB.open('ordCaissonPhotos',3);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function allPhotos(){const db=await openPhotoDb(),tx=db.transaction('photos','readonly'),rows=await req(tx.objectStore('photos').getAll());await done(tx).catch(()=>{});return rows||[]}
function caissonOf(p){const n=Number(p?.caisson??p?.number??p?.itemNumber??p?.item_key??p?.itemKey);return Number.isFinite(n)&&n>=1&&n<=330?Math.trunc(n):null}
function whenOf(p){
  const t=Date.parse(p?.date||p?.capturedAt||p?.captured_at||'');
  if(Number.isFinite(t))return t;
  const m=String(p?.id||'').match(/-(\d{12,15})-/);
  if(m){const n=Number(m[1]);if(Number.isFinite(n))return n}
  return 0;
}
function keyFor(rs,n){
  if(Object.prototype.hasOwnProperty.call(rs,String(n)))return String(n);
  const target='Caisson:'+n;
  for(const [k,r] of Object.entries(rs)){
    if(String(r?.canonicalItemKey||'')===target)return k;
    if(String(r?.sourceNumber??'')===String(n)&&String(r?.itemType||'Caisson')==='Caisson')return k;
  }
  return null;
}
function modal(title,body){
  document.getElementById('fvRecentPhotoRescueModal')?.remove();
  const d=document.createElement('div');d.id='fvRecentPhotoRescueModal';
  d.style.cssText='position:fixed;inset:0;z-index:1900;background:#000a;padding:18px;overflow:auto';
  d.innerHTML='<div style="max-width:560px;margin:5vh auto;background:#fff;color:#16202a;border-radius:18px;padding:18px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h2 style="margin:0">'+title+'</h2><button id="fvRprClose" style="padding:10px;background:#e7edf4;color:#16202a">Close</button></div><div id="fvRprBody" style="margin-top:14px">'+body+'</div></div>';
  document.body.appendChild(d);d.querySelector('#fvRprClose').onclick=()=>d.remove();return d;
}
function html(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
let scanState=null;
async function scan(){
  const a=active();
  if(!a.id||!a.p?.recoveryMaster)throw Error('Open the Recovery Master first.');
  modal('Recent Photo Rescue','<p>Scanning this iPhone for recent FieldVerify photos…</p><p style="font-size:12px;color:#687480">This scan does not change or delete anything.</p>');
  const rs=recordsFor(a.id),rows=await allPhotos(),cut=Date.now()-HOURS*3600000;
  const refs=new Set(Object.values(rs).flatMap(r=>Array.isArray(r?.photos)?r.photos:[]).map(String));
  const candidates=[],skippedProject=[];
  for(const p of rows){
    if(!p?.id||!p?.blob||!Number(p.blob.size))continue;
    const n=caissonOf(p),t=whenOf(p);if(!n||!t||t<cut)continue;
    const pid=String(p.projectId||'');
    if(pid&&pid!==String(a.id)){skippedProject.push(p);continue}
    const key=keyFor(rs,n);if(!key)continue;
    candidates.push({p,n,key,t,linked:refs.has(String(p.id))});
  }
  candidates.sort((x,y)=>x.n-y.n||x.t-y.t);
  const unlinked=candidates.filter(x=>!x.linked);
  const by={};for(const x of candidates){by[x.n]=by[x.n]||{all:0,missing:0};by[x.n].all++;if(!x.linked)by[x.n].missing++}
  scanState={a,rs,candidates,unlinked};
  const rowsHtml=Object.entries(by).map(([n,v])=>'<tr><td style="padding:6px;border-bottom:1px solid #ddd"><b>Caisson '+n+'</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:center">'+v.all+'</td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:center;color:'+(v.missing?'#a51d17':'#12642f')+';font-weight:800">'+v.missing+'</td></tr>').join('');
  const body=$('fvRprBody');
  body.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div style="background:#eef3f8;border-radius:12px;padding:12px;text-align:center"><b style="font-size:28px;color:#083a73">'+candidates.length+'</b><br><span style="font-size:12px">recent photo blobs found</span></div><div style="background:'+(unlinked.length?'#fff0ef':'#eef8f1')+';border-radius:12px;padding:12px;text-align:center"><b style="font-size:28px;color:'+(unlinked.length?'#a51d17':'#12642f')+'">'+unlinked.length+'</b><br><span style="font-size:12px">need relinking</span></div></div>'+
    (rowsHtml?'<table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px"><tr><th style="text-align:left;padding:6px">Item</th><th>Found</th><th>Unlinked</th></tr>'+rowsHtml+'</table>':'<p>No recent photo blobs were found in the local FieldVerify photo database.</p>')+
    (unlinked.length?'<button id="fvRprRelink" style="display:block;width:100%;padding:16px;margin-top:14px;background:#16803d;color:#fff;border-radius:12px;font-size:18px;font-weight:900">RELINK '+unlinked.length+' RECENT PHOTO'+(unlinked.length===1?'':'S')+'</button>':'<div style="margin-top:12px;padding:12px;background:#eef8f1;border-radius:12px;color:#12642f;font-weight:800">All recent local photos found are already linked to the Recovery Master.</div>')+
    '<p style="font-size:12px;color:#687480;margin-top:12px">No photo blob is overwritten. Only exact photo IDs already stored on this iPhone are linked back to the same caisson number.</p>';
  const b=$('fvRprRelink');if(b)b.onclick=relink;
}
async function relink(){
  if(!scanState?.unlinked?.length)return;
  const {a,rs,unlinked}=scanState;
  const affected={};for(const x of unlinked)affected[x.key]=rs[x.key]||null;
  try{localStorage.setItem('fieldVerifyRecentPhotoRescueBackup:'+a.id+':'+Date.now(),JSON.stringify({created:new Date().toISOString(),affected}))}catch{}
  let linked=0;
  for(const x of unlinked){
    const r={...(rs[x.key]||{})};
    r.photos=uniq([...(Array.isArray(r.photos)?r.photos:[]),String(x.p.id)]);
    r.updated=r.updated||new Date().toISOString();
    r.recoveryRecoveredPhotoEvidence=[...(Array.isArray(r.recoveryRecoveredPhotoEvidence)?r.recoveryRecoveredPhotoEvidence:[]),{id:String(x.p.id),source:'recent local photo rescue',recoveredAt:new Date().toISOString(),build:BUILD}];
    rs[x.key]=r;linked++;
  }
  saveRecords(a.id,rs);
  try{if(typeof renderPins==='function')renderPins();if(typeof showTarget==='function')showTarget()}catch{}
  const body=$('fvRprBody');if(body)body.innerHTML='<div style="background:#e7f7ec;border:1px solid #a9d6b5;border-radius:12px;padding:14px"><b style="font-size:18px">'+linked+' recent photo'+(linked===1?'':'s')+' relinked.</b><p style="margin:7px 0 0">The photo files were already on this iPhone; their links to the matching caissons have been restored.</p></div><p style="font-size:12px;color:#687480">Next, FieldVerify will try to upload these linked photos to Cloud. Keep the app open until the Cloud status settles.</p>';
  try{
    if(!window.FIELDVERIFY_CLOUD_PHOTO_UPLOAD_FIX&&typeof loadScript==='function')await loadScript('cloud-photo-upload-fix-v102518.js');
    if(window.FIELDVERIFY_CLOUD_PHOTO_UPLOAD_FIX?.run)window.FIELDVERIFY_CLOUD_PHOTO_UPLOAD_FIX.run();
  }catch(e){console.warn('Photo upload after rescue',e)}
}
function bind(){
  const backup=document.getElementById('backupBtn'),restore=document.getElementById('restoreBtn');
  if(!(backup||restore)||document.getElementById('fvRecentPhotoRescueBtn'))return;
  const b=document.createElement('button');b.id='fvRecentPhotoRescueBtn';b.textContent="RESCUE TODAY'S PHOTOS";
  b.style.cssText='background:#c2410c!important;color:#fff!important;';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();scan().catch(err=>modal('Recent Photo Rescue','<div style="background:#fdecec;border:1px solid #e3abab;border-radius:12px;padding:12px"><b>'+html(err?.message||err)+'</b></div><p style="font-size:12px;color:#687480">Nothing was deleted or changed.</p>'))};
  (restore||backup).insertAdjacentElement('afterend',b);
}
const obs=new MutationObserver(bind);obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(bind,1200);setTimeout(bind,300);
window.FIELDVERIFY_RECENT_PHOTO_RESCUE={build:BUILD,scan,relink};
})();