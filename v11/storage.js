/* FieldVerify Pro 11 storage architecture
   APP STATE: tiny UI preferences only, stored in localStorage.
   USER DATA: projects, records, drawings, photos, markup, etc. stored separately.
   LEGACY DATA: read only on demand as a bridge; never bulk-loaded at startup.
*/

const APP_PREFS_KEY='fieldVerifyV11:appPrefs';
const USER_DB='FieldVerifyUserDataV11';
const USER_DB_VERSION=1;
const LEGACY_PROJECTS='fieldVerifyProjects';
const LEGACY_DRAWINGS='fieldVerifyDrawingLibraryV1024';

const json=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch{return fallback}};
const unique=a=>[...new Set((a||[]).filter(Boolean).map(String))];
const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
const reqDone=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});

export function appPrefs(){const x=json(APP_PREFS_KEY,{});return x&&typeof x==='object'?x:{}}
export function saveAppPrefs(patch){const next={...appPrefs(),...patch};localStorage.setItem(APP_PREFS_KEY,JSON.stringify(next));return next}

export function defaultRecord(){return{itemType:'Caisson',itemLabel:'',status:'No information',verified:false,notes:'',lat:null,lon:null,photos:[],inspection:{},history:[]}}
export function normalizeRecord(r={}){return{...defaultRecord(),...r,photos:unique(r.photos),inspection:(r.inspection&&typeof r.inspection==='object')?r.inspection:{},history:Array.isArray(r.history)?r.history:[]}}
export function newId(prefix='fv11'){return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2,9)}`}

export function openUserDb(){return new Promise((resolve,reject)=>{
  const q=indexedDB.open(USER_DB,USER_DB_VERSION);
  q.onupgradeneeded=()=>{
    const db=q.result;
    if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'});
    if(!db.objectStoreNames.contains('records')){const s=db.createObjectStore('records',{keyPath:'id'});s.createIndex('projectId','projectId');s.createIndex('category','category')}
    if(!db.objectStoreNames.contains('drawingMeta')){const s=db.createObjectStore('drawingMeta',{keyPath:'id'});s.createIndex('projectId','projectId');s.createIndex('category','category')}
    if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'id'});
    if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'});
    if(!db.objectStoreNames.contains('markup'))db.createObjectStore('markup',{keyPath:'id'});
    if(!db.objectStoreNames.contains('ncr'))db.createObjectStore('ncr',{keyPath:'id'});
  };
  q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
})}

async function storeGet(store,id){const db=await openUserDb(),tx=db.transaction(store,'readonly'),v=await reqDone(tx.objectStore(store).get(id));await txDone(tx);return v||null}
async function storeAll(store){const db=await openUserDb(),tx=db.transaction(store,'readonly'),v=await reqDone(tx.objectStore(store).getAll());await txDone(tx);return v||[]}
async function storePut(store,row){const db=await openUserDb(),tx=db.transaction(store,'readwrite');tx.objectStore(store).put(row);await txDone(tx);return row}
async function storeDelete(store,id){const db=await openUserDb(),tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);await txDone(tx)}

/* Project directory is intentionally the only user metadata read during shell startup.
   No inspections, photos, or drawing blobs are touched here. */
export async function projectDirectory(){
  const own=await storeAll('projects');
  const legacy=json(LEGACY_PROJECTS,[]);
  const legacyRows=Array.isArray(legacy)?legacy:[];
  const map=new Map();
  for(const p of legacyRows)if(p?.id!=null)map.set(String(p.id),{...p,id:String(p.id),source:'legacy'});
  for(const p of own)if(p?.id!=null)map.set(String(p.id),{...p,id:String(p.id),source:'v11'});
  if(!map.size)map.set('legacy',{id:'legacy',name:'Existing Foundation Project',source:'legacy'});
  return [...map.values()];
}
export async function saveProject(project){return storePut('projects',{...project,id:String(project.id||newId('project')),source:'v11'})}

function legacyProjectRecords(projectId){
  const direct=json(`fieldVerifyProjectRecords:${projectId}`,null);
  if(direct&&typeof direct==='object')return direct;
  if(String(projectId)==='legacy')return{...json('ordCaissonRecords',{}),...json('foundationInspectorRecords',{})};
  return{};
}

/* Record INDEX is read only after the user chooses a work type.
   This returns lightweight summaries; photo blobs are never touched. */
export async function loadRecordIndex(projectId,category){
  const pid=String(projectId),type=String(category);
  const own=(await storeAll('records')).filter(x=>String(x.projectId)===pid&&String(x.category||x.record?.itemType||'Caisson')===type);
  const map=new Map();
  const legacy=legacyProjectRecords(pid);
  for(const [itemKey,raw] of Object.entries(legacy||{})){
    const r=normalizeRecord(raw);if(String(r.itemType||'Caisson')!==type)continue;
    map.set(String(itemKey),{itemKey:String(itemKey),projectId:pid,category:type,label:String(r.itemLabel||itemKey),status:r.status||'No information',started:Boolean(r.workStartedAt||r.pickupTime||r.unloadTime||(r.photos||[]).length),photoCount:(r.photos||[]).length,source:'legacy'});
  }
  for(const row of own){const r=normalizeRecord(row.record);map.set(String(row.itemKey),{itemKey:String(row.itemKey),projectId:pid,category:type,label:String(r.itemLabel||row.itemKey),status:r.status||'No information',started:Boolean(r.workStartedAt||r.pickupTime||r.unloadTime||(r.photos||[]).length),photoCount:(r.photos||[]).length,source:'v11'})}
  return [...map.values()].sort((a,b)=>String(a.label).localeCompare(String(b.label),undefined,{numeric:true,sensitivity:'base'}));
}

/* Full inspection record is read only when the user explicitly selects/opens an item. */
export async function loadRecord(projectId,itemKey){
  const pid=String(projectId),key=String(itemKey),id=`${pid}|${key}`;
  const own=await storeGet('records',id);if(own?.record)return normalizeRecord(own.record);
  const legacy=legacyProjectRecords(pid);return normalizeRecord(legacy?.[key]||{});
}
export async function saveRecord(projectId,itemKey,record){
  const pid=String(projectId),key=String(itemKey),r=normalizeRecord(record);return storePut('records',{id:`${pid}|${key}`,projectId:pid,itemKey:key,category:String(r.itemType||'Caisson'),record:r,updatedAt:new Date().toISOString()})
}

/* Drawing metadata is read only after the user chooses a work type.
   Actual drawing files/blobs are not read until a specific drawing/page is selected. */
export async function listDrawings(projectId,category){
  const pid=String(projectId),type=String(category),map=new Map();
  const legacy=json(LEGACY_DRAWINGS,[]);
  for(const x of Array.isArray(legacy)?legacy:[]){if(String(x.projectId)!==pid||String(x.category)!==type)continue;map.set(String(x.id),{...x,id:String(x.id),storageId:x.storageId||x.id,source:'legacy'})}
  for(const x of await storeAll('drawingMeta')){if(String(x.projectId)!==pid||String(x.category)!==type)continue;map.set(String(x.id),{...x,source:'v11'})}
  return [...map.values()].sort((a,b)=>(Number(a.pageNumber)||0)-(Number(b.pageNumber)||0)||String(a.description||'').localeCompare(String(b.description||'')));
}
export async function saveDrawingMeta(row){return storePut('drawingMeta',{...row,id:String(row.id),source:'v11'})}
export async function deleteDrawingMeta(id){return storeDelete('drawingMeta',String(id))}
export async function saveFile(row){return storePut('files',{...row,id:String(row.id)})}
export async function getV11File(id){return storeGet('files',String(id))}

/* Legacy IndexedDB bridge. It is opened only after a specific old drawing/photo is requested. */
export function openLegacyDb(){return new Promise((resolve,reject)=>{
  const q=indexedDB.open('ordCaissonPhotos',3);
  q.onupgradeneeded=()=>{
    const db=q.result;
    if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'});
    if(!db.objectStoreNames.contains('ncrPdfs'))db.createObjectStore('ncrPdfs',{keyPath:'id'});
    if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'id'});
  };
  q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
})}
async function legacyGet(store,id){const db=await openLegacyDb(),tx=db.transaction(store,'readonly'),v=await reqDone(tx.objectStore(store).get(String(id)));await txDone(tx);return v||null}
export async function getDrawingFile(meta){if(!meta)return null;if(meta.source==='v11')return getV11File(meta.storageId||meta.fileId);return legacyGet('settings',meta.storageId||meta.id)}

/* Photo bytes are fetched only when the user presses Load Photos for the selected inspection. */
export async function getPhoto(id){return (await storeGet('photos',String(id)))||(await legacyGet('photos',String(id)))}
export async function savePhoto(row){return storePut('photos',{...row,id:String(row.id||newId('photo'))})}

export function getActiveDrawing(projectId,category){return appPrefs().activeDrawings?.[`${projectId}|${category}`]||''}
export function setActiveDrawing(projectId,category,id){const prefs=appPrefs(),map={...(prefs.activeDrawings||{})};if(id)map[`${projectId}|${category}`]=String(id);else delete map[`${projectId}|${category}`];saveAppPrefs({activeDrawings:map})}
