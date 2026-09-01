const V11_PROJECTS='fieldVerifyV11:projects';
const V11_ACTIVE='fieldVerifyV11:activeProject';
const V11_RECORDS=id=>`fieldVerifyV11:records:${id}`;
const V11_DRAWINGS='fieldVerifyV11:drawingLibrary';
const V11_ACTIVE_DRAWING='fieldVerifyV11:activeDrawing';
const LEGACY_PROJECTS='fieldVerifyProjects';
const LEGACY_ACTIVE='fieldVerifyActiveProject';
const LEGACY_DRAWINGS='fieldVerifyDrawingLibraryV1024';

const json=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch{return fallback}};
const put=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const unique=a=>[...new Set((a||[]).filter(Boolean).map(String))];

export function defaultRecord(){return{itemType:'Caisson',itemLabel:'',status:'No information',verified:false,notes:'',lat:null,lon:null,photos:[],inspection:{},history:[]}}

function legacyRecords(projectId){
  const direct=json(`fieldVerifyProjectRecords:${projectId}`,null);
  if(direct&&typeof direct==='object')return direct;
  if(projectId==='legacy'){
    return {...json('ordCaissonRecords',{}),...json('foundationInspectorRecords',{})};
  }
  return {};
}

function normalizeRecord(r={}){
  return {...defaultRecord(),...r,photos:unique(r.photos),inspection:(r.inspection&&typeof r.inspection==='object')?r.inspection:{},history:Array.isArray(r.history)?r.history:[]};
}

export function initializeV11(){
  let projects=json(V11_PROJECTS,null);
  if(!Array.isArray(projects)||!projects.length){
    const old=json(LEGACY_PROJECTS,[]);
    projects=Array.isArray(old)&&old.length?old.map(p=>({...p})):[{id:'legacy',name:'Existing Foundation Project',created:new Date().toISOString()}];
    put(V11_PROJECTS,projects);
    for(const p of projects){
      const source=legacyRecords(String(p.id));
      const cleaned={};for(const [k,r] of Object.entries(source||{}))cleaned[k]=normalizeRecord(r);
      put(V11_RECORDS(String(p.id)),cleaned);
    }
    const oldDrawings=json(LEGACY_DRAWINGS,[]);
    if(Array.isArray(oldDrawings))put(V11_DRAWINGS,oldDrawings.map(x=>({...x,legacy:true,storageId:x.storageId||x.id})));
  }
  let active=localStorage.getItem(V11_ACTIVE)||localStorage.getItem(LEGACY_ACTIVE)||String(projects[0].id);
  if(!projects.some(p=>String(p.id)===String(active)))active=String(projects[0].id);
  localStorage.setItem(V11_ACTIVE,String(active));
  return {projects,activeProjectId:String(active)};
}

export function saveProjects(projects,activeProjectId){put(V11_PROJECTS,projects);localStorage.setItem(V11_ACTIVE,String(activeProjectId))}
export function loadRecords(projectId){const r=json(V11_RECORDS(String(projectId)),{});const out={};for(const [k,v] of Object.entries(r||{}))out[k]=normalizeRecord(v);return out}
export function saveRecords(projectId,records){put(V11_RECORDS(String(projectId)),records)}
export function drawings(){const x=json(V11_DRAWINGS,[]);return Array.isArray(x)?x:[]}
export function saveDrawings(rows){put(V11_DRAWINGS,rows)}
export function activeDrawingMap(){const x=json(V11_ACTIVE_DRAWING,{});return x&&typeof x==='object'?x:{}}
export function getActiveDrawing(projectId,category){return activeDrawingMap()[`${projectId}|${category}`]||''}
export function setActiveDrawing(projectId,category,id){const x=activeDrawingMap();if(id)x[`${projectId}|${category}`]=id;else delete x[`${projectId}|${category}`];put(V11_ACTIVE_DRAWING,x)}

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

const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
const reqDone=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});

export async function getSetting(id){const db=await openLegacyDb(),tx=db.transaction('settings','readonly'),v=await reqDone(tx.objectStore('settings').get(id));await txDone(tx);return v||null}
export async function putSetting(row){const db=await openLegacyDb(),tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(row);await txDone(tx)}
export async function deleteSetting(id){const db=await openLegacyDb(),tx=db.transaction('settings','readwrite');tx.objectStore('settings').delete(id);await txDone(tx)}

export function newId(prefix='fv11'){return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2,9)}`}
