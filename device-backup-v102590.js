/* Bounded device backups: one part in memory, one fresh tap per file save. */
(()=>{
'use strict';
const BUILD='10.25.95',LIMIT=8*1024*1024;
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
 modal(`<p><b>Part ${s.index+1} of ${s.groups.length} ready</b> · ${(s.file.size/1048576).toFixed(1)} MB</p><p>Save every part to the same folder. Restore them one at a time or select all parts together.</p>${s.missing.length?`<p style="color:#a51d17"><b>Partial backup:</b> ${s.missing.length} linked photos are unavailable on this device. Use Cloud → Download All Photos, then make another backup.</p>`:''}<button id="fvPartsZip" style="width:100%;padding:16px;margin-bottom:12px;background:#083a73;color:white">SAVE ALL PARTS AS ONE ZIP</button><button id="fvPartsSave" style="width:100%;padding:16px;background:#16803d;color:white">SAVE PART ${s.index+1} TO FILES</button><button id="fvPartsNext" style="width:100%;padding:14px;margin-top:12px">${s.index+1<s.groups.length?'PREPARE NEXT PART':'FINISH'}</button>`);
 document.getElementById('fvPartsSave').onclick=save;
 document.getElementById('fvPartsZip').onclick=saveZip;
 document.getElementById('fvPartsNext').onclick=async()=>{if(busy)return;busy=true;try{if(s.index+1===s.groups.length){state=null;modal('<p>Backup preparation finished. Check that every part is in your Files folder.</p>');return}s.file=null;s.index++;await buildPart()}catch(e){modal(`<p>Next part failed: ${escape(e.message)}</p>`)}finally{busy=false}};
}
async function save(){if(busy)return;const file=state?.file;if(!file)return;try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'FieldVerify backup part'});return}}catch(e){if(e.name==='AbortError')return}downloadFile(file);toast('Backup download started; check Files / Downloads')}
// ZIP STORE format: write one JSON part at a time, retain only the directory in memory.
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zipHeader(length,values){const a=new Uint8Array(length),v=new DataView(a.buffer);for(const [offset,size,value] of values)size===2?v.setUint16(offset,value,true):v.setUint32(offset,value,true);return a}
async function saveZip(){
 if(busy||!state)return;
 if(typeof window.showSaveFilePicker!=='function'){toast('Bulk ZIP requires Chrome or Edge on a computer. This browser supports the individual backup parts.');return}
 const s=state;let writer=null;
 busy=true;
 try{
 // Ask for the destination directly from the tap, before any asynchronous file reads.
 const handle=await window.showSaveFilePicker({suggestedName:`FieldVerify-${String(s.project.name||'Project').replace(/[^a-z0-9_-]/gi,'-')}-${s.created.slice(0,10)}-${s.setId.slice(0,8)}.zip`,types:[{description:'FieldVerify ZIP backup',accept:{'application/zip':['.zip']}}]});
 writer=await handle.createWritable();const directory=[];let offset=0;
 if(s.groups.length>65535)throw Error('Backup has too many parts for one ZIP');
 for(let i=0;i<s.groups.length;i++){
 if(activeProjectId!==s.pid)throw Error('Project changed; backup stopped');
 s.index=i;s.file=null;await buildPart();
 const file=s.file,name=new TextEncoder().encode(file.name),bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length!==file.size)throw Error('Backup part could not be read completely');
 if(offset+30+name.length+bytes.length>0xffffffff)throw Error('Backup exceeds the 4 GB single-ZIP limit; use the individual parts');
 const crc=crc32(bytes),local=zipHeader(30,[[0,4,0x04034b50],[4,2,20],[6,2,0x800],[12,2,33],[14,4,crc],[18,4,bytes.length],[22,4,bytes.length],[26,2,name.length]]);
 directory.push(zipHeader(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,0x800],[14,2,33],[16,4,crc],[20,4,bytes.length],[24,4,bytes.length],[28,2,name.length],[42,4,offset]]),name);
 modal(`<p><b>Saving ZIP: part ${i+1} of ${s.groups.length}</b></p><p>Keep this tab open until the backup finishes.</p>`);
 await writer.write(local);await writer.write(name);await writer.write(bytes);offset+=local.length+name.length+bytes.length;s.file=null;
 await new Promise(r=>setTimeout(r,0));
 }
 const dirSize=directory.reduce((n,a)=>n+a.length,0);if(offset+dirSize+22>0xffffffff)throw Error('Backup exceeds the single-ZIP limit');
 for(const bytes of directory)await writer.write(bytes);
 await writer.write(zipHeader(22,[[0,4,0x06054b50],[8,2,s.groups.length],[10,2,s.groups.length],[12,4,dirSize],[16,4,offset]]));
 await writer.close();writer=null;state=null;
 modal(`<p><b>ZIP backup saved: ${s.groups.length} parts in one file.</b></p><p>Extract the ZIP on your computer, then select all JSON parts together to restore.</p>${s.missing.length?`<p style="color:#a51d17">${s.missing.length} linked photos were unavailable on this device and are absent from this backup.</p>`:''}`);
 }catch(e){if(writer)try{await writer.abort()}catch{};if(e.name==='AbortError'){if(state)await buildPart();return}modal(`<p>ZIP backup did not finish: ${escape(e.message)}</p><p>Your original data is still saved in the app. Close this dialog and try Backup to Device again.</p>`)}finally{busy=false}
}
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
window.FIELDVERIFY_DEVICE_BACKUP={build:BUILD,prepare,restoreParts,saveZip};
})();
