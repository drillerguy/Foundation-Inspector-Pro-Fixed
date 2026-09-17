(()=>{
'use strict';
const VERSION='10.25.70-work-type-identity';
const BASES={ERS:1000000,Tieback:2000000};
function normalizeType(type){const t=String(type||'Caisson').trim();return t||'Caisson'}
function visibleNumber(value){const m=String(value??'').match(/\d{1,6}/);return m?Number(m[0]):NaN}
function keyFor(type,number){const t=normalizeType(type),n=visibleNumber(number);if(!Number.isInteger(n)||n<0)return String(number??'');if(t==='ERS')return BASES.ERS+n;if(t==='Tieback')return BASES.Tieback+n;return n}
function canonical(type,label,number){const t=normalizeType(type),n=visibleNumber(label??number);if(t==='ERS')return `ERS:E-${n}`;if(t==='Tieback')return `Tieback:E-${n}`;if(t==='Waler')return `Waler:${String(label||number||'').trim()}`;if(t==='Caisson')return `Caisson:${n}`;return `${t}:${String(label||number||'').trim()}`}
function recordType(r){return normalizeType(r?.itemType||'Caisson')}
function locate(type,number){const t=normalizeType(type),safeKey=keyFor(t,number);try{const safe=typeof records!=='undefined'?records?.[safeKey]:null;if(safe&&recordType(safe)===t)return{key:safeKey,record:safe,legacy:false};const n=visibleNumber(number),legacy=typeof records!=='undefined'?records?.[n]:null;if(legacy&&recordType(legacy)===t)return{key:n,record:legacy,legacy:true}}catch{}return{key:safeKey,record:null,legacy:false}}
function seed(type,number,label){const t=normalizeType(type),target=keyFor(t,number),found=locate(t,number),base=found.record||((typeof rec==='function')?rec(target):{});return{key:target,record:{...base,itemType:t,itemLabel:String(label||base?.itemLabel||'').trim(),canonicalItemKey:canonical(t,label,number),sourceNumber:visibleNumber(number)}}}
window.FIELDVERIFY_ITEM_IDENTITY={version:VERSION,keyFor,canonical,locate,seed,visibleNumber,bases:{...BASES}};
console.info(`FieldVerify work-type identity ${VERSION} loaded`);
})();
