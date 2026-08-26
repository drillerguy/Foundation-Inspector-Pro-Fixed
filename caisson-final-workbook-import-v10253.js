/* FieldVerify Pro v10.25.3 - exact importer for caisson_schedule_workbook_FINAL */
(()=>{
'use strict';
const VERSION='10.25.3-final-workbook-import-1';
if(window.FIELDVERIFY_FINAL_CAISSON_IMPORT?.version===VERSION)return;
let input=null;
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function exact(row,names){const keys=Object.keys(row||{});for(const name of names){const n=norm(name),k=keys.find(x=>norm(x)===n);if(k!=null)return row[k]}return''}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function yes(v){return /^y(es)?$/i.test(String(v??'').trim())}
function ensure(r){r.inspection=(r.inspection&&typeof r.inspection==='object')?r.inspection:{};r.inspection.caissonGeneral=(r.inspection.caissonGeneral&&typeof r.inspection.caissonGeneral==='object')?r.inspection.caissonGeneral:{};return r.inspection.caissonGeneral}
function liveRecord(key){if(typeof records==='undefined'||!records)return null;if(!records[key])records[key]=typeof defaultRec==='function'?defaultRec():{};return records[key]}
async function xlsx(){if(window.XLSX)return window.XLSX;if(typeof loadXlsxLibrary==='function'){try{const x=await loadXlsxLibrary();if(x||window.XLSX)return x||window.XLSX}catch{}}return await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./xlsx.full.min.js?v=10.25.3';s.onload=()=>window.XLSX?resolve(window.XLSX):reject(Error('Excel reader did not initialize'));s.onerror=()=>reject(Error('Excel reader could not load'));document.head.appendChild(s)})}
function fileInput(){if(input)return input;input=document.createElement('input');input.type='file';input.accept='.xlsx,.xls';input.style.display='none';document.body.appendChild(input);input.onchange=importWorkbook;return input}
function removeOtherButtons(){document.querySelectorAll('button').forEach(b=>{if(b.id!=='fvFinalCaissonImport'&&/IMPORT CAISSON EXCEL/i.test(b.textContent||''))b.remove()})}
function installButton(){removeOtherButtons();let b=document.getElementById('fvFinalCaissonImport');if(b)return;const top=document.querySelector('.gpsline')||document.querySelector('.top');if(!top)return;b=document.createElement('button');b.id='fvFinalCaissonImport';b.type='button';b.textContent='IMPORT CAISSON EXCEL';b.style.cssText='padding:8px 10px;border-radius:999px;border:1px solid #ffffff44;background:#16803d;color:#fff;font-weight:900;font-size:11px';b.title='Import the FINAL caisson schedule workbook';b.onclick=()=>fileInput().click();top.appendChild(b)}
async function importWorkbook(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const XLSX=await xlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const sheetName=wb.SheetNames.find(n=>norm(n)==='schedule entry')||wb.SheetNames.find(n=>/schedule/i.test(n));if(!sheetName)throw Error('The workbook does not contain the Schedule_Entry sheet.');const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{defval:'',raw:false});if(!rows.length)throw Error('Schedule_Entry has no caisson rows.');let imported=0,missing=0;const missingKeys=[];for(let i=0;i<rows.length;i++){
 const row=rows[i];
 const explicit=String(exact(row,['Caisson No.','Caisson No','Caisson Number','Caisson #'])??'').trim();
 // In caisson_schedule_workbook_FINAL, column A is intentionally blank. Rows 2-329 are caissons 1-328 in order.
 const parsed=explicit.match(/\d+/);const key=parsed?String(Number(parsed[0])):String(i+1);
 const r=liveRecord(key);if(!r){missing++;missingKeys.push(key);continue}
 const g=ensure(r);
 const type=String(exact(row,['Type Code','Type'])??'').trim();
 const shaft=num(exact(row,['Shaft Dia (in)','Shaft Dia','Shaft Diameter']));
 const bell=exact(row,['Bell? (Y/N)','Bell?','Bell']);
 const bellDia=num(exact(row,['Bell Dia (ft)','Bell Dia','Bell Diameter']));
 const bellHt=num(exact(row,['Bell Height (ft)','Bell Height']));
 const top=num(exact(row,['Top of Caisson EL (ft)','Top EL (ft)','Top EL']));
 const bottom=num(exact(row,['Bottom of Shaft EL (ft)','Bottom EL (ft)','Bottom EL']));
 const socket=exact(row,['Rock Socket? (Y/N)','Socket? (Y/N)','Rock Socket?']);
 const socketDia=num(exact(row,['Socket Dia (ft)','Socket Dia']));
 const socketDepth=num(exact(row,['Socket Depth (ft)','Socket Depth']));
 const notes=String(exact(row,['Notes / Sheet Ref','Notes'])??'').trim();
 g.typeCode=type;g.shaftType=type;g.shaftDiameter=shaft!=null?String(shaft):'';g.bell=String(bell||'').trim();g.bellDiameter=bellDia!=null?String(bellDia):'';g.bellHeight=bellHt!=null?String(bellHt):'';g.topElevation=top!=null?String(top):'';g.bottomElevation=bottom!=null?String(bottom):'';g.length=(top!=null&&bottom!=null)?String(Math.round((top-bottom)*1000)/1000):'';g.rockSocket=String(socket||'').trim();g.socketDiameter=socketDia!=null?String(socketDia):'';g.socketDepth=socketDepth!=null?String(socketDepth):'';g.linkDepth=socketDepth!=null?String(socketDepth):'';g.notes=notes;g.isBelled=yes(bell);g.hasRockSocket=yes(socket);g.importedFrom=file.name;g.updatedAt=new Date().toISOString();
 r.itemType='Caisson';r.updated=new Date().toISOString();imported++;
 }
 try{persist()}catch{try{localStorage.setItem(projectRecordsKey(),JSON.stringify(records))}catch{}}
 try{renderPins()}catch{};try{showTarget()}catch{};
 alert(`Caisson schedule import complete.\n\n${imported} caissons loaded from Schedule_Entry.\nRows were matched as Caisson 1 through ${rows.length}${missing?`.\n${missing} drawing records were not found: ${missingKeys.slice(0,20).join(', ')}${missingKeys.length>20?'…':''}`:''}.\n\nLoaded: type code, shaft diameter, bell data, top/bottom elevations, shaft length, rock socket data, and notes.`)
 }catch(err){console.error('FINAL caisson workbook import',err);alert('Caisson schedule import failed: '+(err?.message||err))}}
const obs=new MutationObserver(()=>installButton());obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(installButton,1200);setTimeout(()=>{fileInput();installButton()},100);
window.FIELDVERIFY_FINAL_CAISSON_IMPORT={version:VERSION,importExcel:()=>fileInput().click()};
console.info('FieldVerify FINAL caisson workbook importer '+VERSION+' loaded');
})();