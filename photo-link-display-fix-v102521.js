/* Only exact linked IDs belong in the photo viewer. Never scan other projects. */
(()=>{
'use strict';
async function fixedGetPhotos(key){
 const pid=activeProjectId,ids=[...new Set((records[String(key)]?.photos||[]).map(String))];
 const db=await openDB();try{
 const read=()=>new Promise((resolve,reject)=>{const tx=db.transaction('photos'),store=tx.objectStore('photos'),out=[];for(const id of ids){const q=store.get(id);q.onsuccess=()=>{if(q.result?.blob?.size)out.push(q.result)}}tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
 let rows=await read();
 if(rows.length<ids.length&&navigator.onLine&&window.FIELDVERIFY_CLOUD_SYNC){try{await window.FIELDVERIFY_CLOUD_SYNC.downloadPhotos(ids);if(pid===activeProjectId)rows=await read()}catch(e){console.warn('Cloud photo load',e)}}
 return pid===activeProjectId?rows:[];
 }finally{db.close()}
}
getPhotos=fixedGetPhotos;
window.FIELDVERIFY_PHOTO_LINK_DISPLAY_FIX={version:'10.25.90',getPhotos:fixedGetPhotos,refresh:async()=>{await fixedGetPhotos(selected);showTarget()}};
})();
