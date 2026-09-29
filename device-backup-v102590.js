/* Bounded device backups: one part in memory, one fresh tap per file save. */
(()=>{
'use strict';
const BUILD='10.25.90',LIMIT=8*1024*1024;
const uniq=a=>[...new Set((a||[]).map(String))];
let state=null,busy=false;
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function modal(text){let d=document.getElementById('fvDeviceParts');if(!d){d=document.createElement('div');d.id='fvDeviceParts';d.style.cssText='position:fixed;inset:0;z-index:1800;background:#000a;padding:18px;overflow:auto';d.innerHTML='<div style="max-width:560px;margin:5vh auto;background:white;padding:20px;border-radius:18px;color:#16202a"><button id="fvPartsClose" style="float:right;padding:10px">Close</button><h2>Device backup</h2><div id="fvPartsBody"></div></div>';document.body.appendChild(d);d.querySelector('button').onclick=()=>{if(busy)return;state=null;d.remove()}}
 d.querySelector('#fvPartsBody').innerHTML=text;return d}
function transactionDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||Error('Storage transaction aborted'))})}
async function read(store,id){const db=await openDB();try{const tx=db.transaction(store),done=transactionDone(tx),q=tx.objectStore(store).get(id),row=await new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});await done;return row}finally{db.close()}}
async function keys(store){const db=await openDB();try{const tx=db.transaction(store),done=transactionDone(tx),q=tx.objectStore(store).getAllKeys(),ids=await new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});await done;return ids}finally{db.close()}}
async function write(store,row){const db=await openDB();try{const tx=db.transaction(store,'readwrite'),done=transactionDone(tx);tx.objectStore(store).put(row);await done}finally{db.close()}}
function json(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
async function prepare(){
 if(busy)return;busy=true;state=null;modal('<p>Checking saved photo files…</p>');
 try{const pid=activeProjectId,project=JSON.parse(JSON.stringify(activeProject())),rs=JSON.parse(JSON.stringify(records)),ncr=JSON.parse(JSON.stringify(ncrRows));
 const refs=uniq(Object.values(rs).flatMap(r=>r?.photos||[])),items=[],missing=[];
 for(let i=0;i<refs.length;i++){const p=await read('photos',refs[i]);if(p?.blob?.size)items.push({store:'photos',id:refs[i],size:p.blob.size});else missing.push(refs[i]);if(i%10===0){modal(`<p>Checking photos: ${i+1} of ${refs.length}</p>`);await new Promise(r=>setTimeout(r,0))}}
 // Capture the custom drawing and drawing library source files, without rendering PDFs.
 const library=json('fieldVerifyDrawingLibraryV1024',[]).filter(x=>String(x.projectId)===String(pid)||String(x.projectId)===String(project.cloudId));
 const drawingIds=uniq([drawingStorageId(),...library.flatMap(x=>[x.id,x.sourceId].filter(Boolean))]);
 for(const id of drawingIds){const d=await read('settings',id);if(d?.blob?.size)items.push({store:'settings',id,size:d.blob.size})}
 for(const id of await keys('ncrPdfs')){const p=await read('ncrPdfs',id);if(p?.blob?.size)items.push({store:'ncrPdfs',id,size:p.blob.size})}
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('ncrpdfdata:')&&!items.some(x=>x.store==='ncrPdfs'&&x.id===k.slice(11)))items.push({store:'legacyPdf',id:k.slice(11),size:(localStorage.getItem(k)||'').length})}
 const groups=[[]];let size=0;for(const item of items){if(size+item.size>LIMIT&&groups.at(-1).length){groups.push([]);size=0}groups.at(-1).push(item);size+=item.size}
 state={pid,project,rs,ncr,library,groups,missing,index:0,file:null,setId:crypto.randomUUID(),created:new Date().toISOString()};
 await buildPart();
 }catch(e){modal(`<p>Backup could not be prepared: ${escape(e.message)}</p>`)}finally{busy=false}
}
async function buildPart(){
 const s=state;if(!s)return;
 modal(`<p>Preparing part ${s.index+1} of ${s.groups.length}…</p>`);
 const payload={app:'FieldVerify Pro',backupFormat:'FieldVerify Device Parts',version:90,created:s.created,project:s.project,records:s.rs,ncrRows:s.ncr,photos:[],ncrPdfs:[],settings:[],drawingLibrary:s.library,activeDrawings:json('fieldVerifyActiveDrawingV1024',{}),part:{setId:s.setId,index:s.index+1,total:s.groups.length},photoBackup:{referenced:uniq(Object.values(s.rs).flatMap(r=>r?.photos||[])).length,missingIds:s.missing}};
 for(const item of s.groups[s.index]){if(item.store==='legacyPdf'){payload.ncrPdfs.push({id:item.id,data:localStorage.getItem('ncrpdfdata:'+item.id)});continue}
 const row=await read(item.store,item.id);if(!row?.blob?.size)throw Error('A backup file became unavailable: '+item.id);
 const data=await blobToDataURL(row.blob),encoded={...row,blob:undefined,data};payload[item.store==='settings'?'settings':item.store].push(encoded);await new Promise(r=>setTimeout(r,0))}
 s.file=new File([JSON.stringify(payload)],`FieldVerify-${String(s.project.name||'Project').replace(/[^a-z0-9_-]/gi,'-')}-${s.created.slice(0,10)}-${s.setId.slice(0,8)}-part-${String(s.index+1).padStart(3,'0')}-of-${s.groups.length}.json`,{type:'application/json'});
 modal(`<p><b>Part ${s.index+1} of ${s.groups.length} ready</b> · ${(s.file.size/1048576).toFixed(1)} MB</p><p>Save every part to the same folder. Restore them one at a time or select all parts together.</p>${s.missing.length?`<p style="color:#a51d17"><b>Partial backup:</b> ${s.missing.length} linked photos are unavailable on this device. Use Cloud → Download All Photos, then make another backup.</p>`:''}<button id="fvPartsSave" style="width:100%;padding:16px;background:#16803d;color:white">SAVE PART ${s.index+1} TO FILES</button><button id="fvPartsNext" style="width:100%;padding:14px;margin-top:12px">${s.index+1<s.groups.length?'PREPARE NEXT PART':'FINISH'}</button>`);
 document.getElementById('fvPartsSave').onclick=save;
 document.getElementById('fvPartsNext').onclick=async()=>{if(busy)return;busy=true;try{if(s.index+1===s.groups.length){state=null;modal('<p>Backup preparation finished. Check that every part is in your Files folder.</p>');return}s.file=null;s.index++;await buildPart()}catch(e){modal(`<p>Next part failed: ${escape(e.message)}</p>`)}finally{busy=false}};
}
async function save(){const file=state?.file;if(!file)return;try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'FieldVerify backup part'});return}}catch(e){if(e.name==='AbortError')return}downloadFile(file);toast('Backup download started; check Files / Downloads')}
function merge(a={},b={}){const newer=(Date.parse(a.updated)||0)>(Date.parse(b.updated)||0)?a:b;return{...a,...b,...newer,photos:uniq([...(a.photos||[]),...(b.photos||[])])}}
async function restoreParts(files){
 const pid=activeProjectId;let saved=0,setId=null,total=0;const restored=new Set();
 for(let f=0;f<files.length;f++){
 const p=JSON.parse(await files[f].text());if(p.backupFormat!=='FieldVerify Device Parts')throw Error('Choose only device backup parts in this selection');if(setId&&setId!==p.part?.setId)throw Error('These parts belong to different backup sets');setId=p.part?.setId;total=p.part?.total||files.length;restored.add(p.part?.index);if(pid!==activeProjectId)throw Error('Project changed; restore paused');
 for(const [key,r] of Object.entries(p.records||{}))records[key]=merge(records[key],r);
 if(!ncrRows.length&&Array.isArray(p.ncrRows))ncrRows=p.ncrRows;
 // Commit each file individually so an interrupted restore can resume safely.
 for(const row of p.photos||[]){const blob=dataURLToBlob(row.data);await write('photos',{...row,data:undefined,blob,projectId:pid});saved++;toast(`Restoring part ${f+1}/${files.length}: ${saved} photos saved`)}
 for(const row of p.ncrPdfs||[]){await write('ncrPdfs',{...row,data:undefined,blob:dataURLToBlob(row.data)});localStorage.setItem('ncrpdf:'+row.id,'yes')}
 for(const row of p.settings||[]){let id=row.id;if(id==='drawing'||id===`drawing:${p.project?.id}`)id=drawingStorageId();await write('settings',{...row,id,data:undefined,blob:dataURLToBlob(row.data)})}
 if(p.drawingLibrary?.length){const old=json('fieldVerifyDrawingLibraryV1024',[]),byId=new Map(old.map(x=>[x.id,x]));for(const d of p.drawingLibrary)byId.set(d.id,{...d,projectId:pid});localStorage.setItem('fieldVerifyDrawingLibraryV1024',JSON.stringify([...byId.values()]))}
 if(p.activeDrawings){const active=json('fieldVerifyActiveDrawingV1024',{});for(const [key,value] of Object.entries(p.activeDrawings)){if(key.startsWith(String(p.project?.id)+'|'))active[pid+key.slice(String(p.project.id).length)]=value}localStorage.setItem('fieldVerifyActiveDrawingV1024',JSON.stringify(active))}persist();persistNcr();await new Promise(r=>setTimeout(r,0));
 }
 await applyStoredDrawing();showProjectHome();toast(`Restored ${restored.size} of ${total} backup parts · ${saved} photos${restored.size<total?' · select remaining parts to finish':''}`);return{files:files.length,photos:saved};
}
const input=document.getElementById('restoreInput');if(input){const previous=input.onchange;input.onchange=async e=>{const files=[...(e.target.files||[])];if(!files.length)return;
 // Filename detection avoids parsing all files up front.
 if(files.every(f=>/-part-\d+-of-\d+\.json$/i.test(f.name))){try{await restoreParts(files)}catch(err){toast('Restore paused: '+err.message)}finally{input.value=''}return}return previous?.call(input,e)}}
window.FIELDVERIFY_DEVICE_BACKUP={build:BUILD,prepare,restoreParts};
})();
