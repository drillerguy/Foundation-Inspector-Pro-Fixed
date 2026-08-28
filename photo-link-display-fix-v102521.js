(()=>{
'use strict';
const VERSION='10.25.21-photo-link-display-1';
let originalGetPhotos=null,refreshTimer=null;
function say(s){try{toast(s)}catch{}}
function req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function done(tx){return new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}
function keyString(k){return k===null||k===undefined?'':String(k)}
function recordFor(k){try{return (typeof records==='object'&&records)?records[keyString(k)]||records[k]||null:null}catch{return null}}
async function byIds(ids){
 if(typeof openDB!=='function'||!ids.length)return[];
 const db=await openDB(),tx=db.transaction('photos','readonly'),store=tx.objectStore('photos'),out=[];
 for(const id of ids){try{const p=await req(store.get(String(id)));if(p&&p.blob&&typeof p.blob.size==='number'&&p.blob.size>0)out.push(p)}catch{}}
 await done(tx);return out;
}
async function allForItem(k){
 if(typeof openDB!=='function')return[];
 const want=keyString(k),db=await openDB(),tx=db.transaction('photos','readonly'),rows=await req(tx.objectStore('photos').getAll());await done(tx);
 return (rows||[]).filter(p=>p&&p.blob&&typeof p.blob.size==='number'&&p.blob.size>0&&(keyString(p.caisson)===want||keyString(p.number)===want||keyString(p.item_key)===want));
}
async function fixedGetPhotos(k){
 const rec=recordFor(k),ids=Array.isArray(rec?.photos)?rec.photos.filter(Boolean).map(String):[];
 if(ids.length){const p=await byIds(ids);if(p.length)return p}
 try{if(typeof originalGetPhotos==='function'){const p=await originalGetPhotos(k);if(p&&p.length)return p}}catch(e){console.warn('Original getPhotos failed',e)}
 return allForItem(k);
}
function install(){
 try{
  if(window.__fvPhotoLinkDisplayInstalled)return;
  if(typeof window.getPhotos==='function')originalGetPhotos=window.getPhotos.bind(window);
  window.getPhotos=fixedGetPhotos;
  try{getPhotos=fixedGetPhotos}catch{}
  window.__fvPhotoLinkDisplayInstalled=true;
 }catch(e){console.warn('Photo display fix install',e)}
}
async function selectedKey(){try{if(typeof selected!=='undefined'&&selected!==null&&selected!=='')return selected}catch{};return null}
async function verifyAndRefresh(show=false){
 install();const k=await selectedKey();if(k===null)return 0;
 try{
  const rec=recordFor(k),expected=Array.isArray(rec?.photos)?rec.photos.length:0,p=await fixedGetPhotos(k);
  if(show)say(expected?`${p.length} of ${expected} photos ready on this device`:`${p.length} photos ready on this device`);
  try{if(typeof showTarget==='function')showTarget()}catch{}
  return p.length;
 }catch(e){console.warn('Photo display refresh',e);if(show)say(`Photo display refresh failed: ${e.message||e}`);return 0}
}
function queue(ms=120){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>verifyAndRefresh(false),ms)}
document.addEventListener('click',e=>{if(e.target?.closest?.('#fvSyncNow,.openProject,#projectHeaderSelect'))setTimeout(()=>verifyAndRefresh(true),900)},true);
document.addEventListener('change',e=>{if(e.target?.id==='projectHeaderSelect')queue(500)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue(250)});
setInterval(install,1000);
setTimeout(()=>{install();verifyAndRefresh(false)},500);
window.FIELDVERIFY_PHOTO_LINK_DISPLAY_FIX={version:VERSION,refresh:()=>verifyAndRefresh(true),getPhotos:fixedGetPhotos};
console.info(`FieldVerify photo link display fix ${VERSION} loaded`);
})();