const PALETTE={gray:'#8b95a1',orange:'#d97706',gold:'#ca8a04',blue:'#2563eb',purple:'#7c3aed',teal:'#0f766e',green:'#15803d',red:'#b42318'};

const PROGRESS={
  ERS:[
    {id:'installed',label:'Installed',color:PALETTE.orange},
    {id:'welded',label:'Welded / Connected',color:PALETTE.blue},
    {id:'inspected',label:'Inspected',color:PALETTE.green}
  ],
  Tieback:[
    {id:'drilled',label:'Drilled',color:PALETTE.orange},
    {id:'initialGrout',label:'Initial Grout',color:PALETTE.gold},
    {id:'regrouted',label:'Regrouted',color:PALETTE.blue},
    {id:'tested',label:'Tested',color:PALETTE.purple},
    {id:'lockedOff',label:'Locked Off',color:PALETTE.green}
  ],
  Waler:[
    {id:'hung',label:'Hung / Installed',color:PALETTE.orange},
    {id:'welded',label:'Welded',color:PALETTE.blue},
    {id:'inspected',label:'Inspected',color:PALETTE.green}
  ]
};

export function itemType(r={}){return String(r.itemType||r.category||'Caisson')}
export function itemLabel(key,r={}){const raw=String(r.itemLabel||r.label||'').trim();return raw||String(key)}
export function itemTitle(key,r={}){const type=itemType(r),id=itemLabel(key,r);if(type==='ERS')return `Sheet Number ${id}`;return `${type} ${id}`}
export function hasStarted(r={}){return Boolean(r.workStartedAt||r.pickupTime||r.unloadTime||(Array.isArray(r.photos)&&r.photos.length))}
export function isComplete(r={}){return Boolean(r.workCompletedAt||r.unloadTime||r.status==='Complete'||r.status==='Completed')}
export function ncrState(r={}){return String(r.ncrState||r.inspection?.ncrState||'').toLowerCase()}
export function progressStages(type){return (PROGRESS[String(type)]||[]).map(x=>({...x}))}
export function progressViewOptions(type){return[{id:'overall',label:'Overall Progress',color:null},...progressStages(type)]}
export function progressMap(r={}){return r.progress&&typeof r.progress==='object'?r.progress:{}}
export function stageDone(r={},stageId){const v=progressMap(r)[stageId];return Boolean(v)}
export function highestProgressStage(r={},type=itemType(r)){
  let hit=null;for(const stage of progressStages(type))if(stageDone(r,stage.id))hit=stage;return hit
}
export function progressSummary(r={},type=itemType(r)){
  const top=highestProgressStage(r,type);if(top)return top.label;if(isComplete(r))return'Complete';if(hasStarted(r))return'In Progress';return'Not Started'
}
export function setProgressStage(r={},stageId,done=true){
  const next={...(r.progress&&typeof r.progress==='object'?r.progress:{})};
  if(done)next[stageId]=typeof done==='string'?done:new Date().toISOString();else delete next[stageId];
  r.progress=next;return r
}
export function pinVisual(r={},type=itemType(r),view='overall'){
  if(ncrState(r)==='open')return{color:PALETTE.red,label:'NCR OPEN',stageId:'ncr'};
  const stages=progressStages(type);
  if(view&&view!=='overall'){
    const stage=stages.find(x=>x.id===view);
    if(stage)return stageDone(r,stage.id)?{color:stage.color,label:stage.label,stageId:stage.id}:{color:PALETTE.gray,label:`${stage.label}: not complete`,stageId:stage.id};
  }
  const top=highestProgressStage(r,type);if(top)return{color:top.color,label:top.label,stageId:top.id};
  if(isComplete(r))return{color:PALETTE.green,label:'Complete',stageId:'complete'};
  if(hasStarted(r))return{color:PALETTE.purple,label:'In Progress',stageId:'started'};
  if(Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon)))return{color:PALETTE.teal,label:'Location Known',stageId:'known'};
  return{color:PALETTE.gray,label:'Not Started',stageId:'not-started'}
}
export function pinClass(r={}){const out=['pin'];if(ncrState(r)==='open')out.push('ncr-open');return out.join(' ')}
export function statusText(r={}){if(ncrState(r)==='open')return'NCR OPEN';const top=highestProgressStage(r,itemType(r));if(top)return top.label.toUpperCase();if(isComplete(r))return'COMPLETE';if(hasStarted(r))return'IN PROGRESS';if(Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon)))return'LOCATION KNOWN';return'NOT STARTED'}
export const progressPalette={...PALETTE};
