export function itemType(r={}){return String(r.itemType||'Caisson')}
export function itemLabel(key,r={}){const raw=String(r.itemLabel||'').trim();return raw||String(key)}
export function itemTitle(key,r={}){const type=itemType(r),id=itemLabel(key,r);if(type==='ERS')return `Sheet Number ${id}`;return `${type} ${id}`}
export function hasStarted(r={}){return Boolean(r.workStartedAt||r.pickupTime||r.unloadTime||(Array.isArray(r.photos)&&r.photos.length))}
export function isComplete(r={}){return Boolean(r.workCompletedAt||r.unloadTime||r.status==='Complete'||r.status==='Completed')}
export function ncrState(r={}){const s=String(r.ncrState||r.inspection?.ncrState||'').toLowerCase();return s}
export function pinClass(r={}){const out=['pin'];if(Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon)))out.push('known');if(hasStarted(r))out.push('field-work');if(isComplete(r))out.push('done');if(ncrState(r)==='open')out.push('ncr-open');return out.join(' ')}
export function statusText(r={}){if(ncrState(r)==='open')return 'NCR OPEN';if(isComplete(r))return 'COMPLETE';if(hasStarted(r))return 'IN PROGRESS';if(Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon)))return 'LOCATION KNOWN';return 'NOT STARTED'}
