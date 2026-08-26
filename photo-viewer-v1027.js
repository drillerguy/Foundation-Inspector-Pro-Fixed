(()=>{
'use strict';
const VERSION='10.24-photo-viewer-3';
let currentPhotos=[],currentIndex=0,currentUrls=[],zoom=1;
function revokeUrls(){for(const u of currentUrls)try{URL.revokeObjectURL(u)}catch{};currentUrls=[]}
function safeName(p){const raw=String(p?.name||`FieldVerify-Photo-${currentIndex+1}.jpg`).replace(/[^a-z0-9._-]+/gi,'-');return raw.includes('.')?raw:`${raw}.jpg`}
function say(s){try{toast(s)}catch{}}
function ensureViewer(){
 if(document.getElementById('fvPhotoViewer'))return;
 const wrap=document.createElement('div');wrap.id='fvPhotoViewer';wrap.className='hidden';wrap.style.cssText='position:fixed;inset:0;z-index:2200;background:#000;display:none;flex-direction:column;align-items:center;justify-content:center;padding:env(safe-area-inset-top) 10px env(safe-area-inset-bottom);overflow:auto';
 wrap.innerHTML=`<button id="fvPhotoClose" aria-label="Close photo" style="position:absolute;top:calc(10px + env(safe-area-inset-top));right:12px;z-index:3;background:#fff;color:#111;border-radius:999px;width:44px;height:44px;font-size:24px">×</button><button id="fvPhotoPrev" aria-label="Previous photo" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:3;background:#ffffffdd;color:#111;border-radius:999px;width:46px;height:46px;font-size:28px">‹</button><div id="fvPhotoStage" style="width:100%;height:76vh;display:flex;align-items:center;justify-content:center;overflow:auto;-webkit-overflow-scrolling:touch"><img id="fvPhotoFull" alt="Inspection photo" style="max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;transition:transform .12s ease;touch-action:pan-x pan-y pinch-zoom"></div><button id="fvPhotoNext" aria-label="Next photo" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:3;background:#ffffffdd;color:#111;border-radius:999px;width:46px;height:46px;font-size:28px">›</button><div style="position:absolute;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));display:grid;gap:8px;z-index:3"><div id="fvPhotoCaption" style="color:#fff;text-align:center;font:600 14px -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;text-shadow:0 1px 4px #000;background:#0008;border-radius:10px;padding:8px"></div><div style="display:grid;grid-template-columns:auto auto 1fr 1fr;gap:8px"><button id="fvPhotoZoomOut" aria-label="Zoom out" style="padding:12px;background:#e7edf4;color:#111;border-radius:10px;font-weight:900">−</button><button id="fvPhotoZoomIn" aria-label="Zoom in" style="padding:12px;background:#e7edf4;color:#111;border-radius:10px;font-weight:900">＋</button><button id="fvPhotoShare" style="padding:12px;background:#0b67c2;color:#fff;border-radius:10px;font-weight:900">SHARE / EMAIL / CLOUD</button><button id="fvPhotoSave" style="padding:12px;background:#16803d;color:#fff;border-radius:10px;font-weight:900">SAVE TO DEVICE</button></div></div>`;
 document.body.appendChild(wrap);
 document.getElementById('fvPhotoClose').onclick=closeViewer;
 document.getElementById('fvPhotoPrev').onclick=()=>step(-1);
 document.getElementById('fvPhotoNext').onclick=()=>step(1);
 document.getElementById('fvPhotoShare').onclick=shareCurrent;
 document.getElementById('fvPhotoSave').onclick=saveCurrent;
 document.getElementById('fvPhotoZoomIn').onclick=()=>setZoom(zoom+.5);
 document.getElementById('fvPhotoZoomOut').onclick=()=>setZoom(zoom-.5);
 document.getElementById('fvPhotoFull').onclick=()=>setZoom(zoom===1?2:1);
 wrap.addEventListener('click',e=>{if(e.target===wrap)closeViewer()});
}
function setZoom(v){zoom=Math.max(1,Math.min(4,v));const img=document.getElementById('fvPhotoFull');if(img)img.style.transform=`scale(${zoom})`}
function renderViewer(){if(!currentPhotos.length)return;currentIndex=(currentIndex+currentPhotos.length)%currentPhotos.length;const p=currentPhotos[currentIndex],img=document.getElementById('fvPhotoFull'),cap=document.getElementById('fvPhotoCaption');zoom=1;img.style.transform='scale(1)';img.src=currentUrls[currentIndex];cap.textContent=`${currentIndex+1} of ${currentPhotos.length}${p?.date?` · ${new Date(p.date).toLocaleString()}`:''} · Tap photo to zoom`;const multi=currentPhotos.length>1;document.getElementById('fvPhotoPrev').style.display=multi?'block':'none';document.getElementById('fvPhotoNext').style.display=multi?'block':'none'}
function step(d){if(!currentPhotos.length)return;currentIndex+=d;renderViewer()}
function closeViewer(){const v=document.getElementById('fvPhotoViewer');if(v){v.style.display='none';v.classList.add('hidden')}revokeUrls();currentPhotos=[];zoom=1}
async function photoFile(){const p=currentPhotos[currentIndex];if(!p?.blob)throw Error('Photo is not available on this device');return new File([p.blob],safeName(p),{type:p.type||p.blob.type||'image/jpeg',lastModified:Date.now()})}
async function shareCurrent(){try{const file=await photoFile(),payload={files:[file]};if(navigator.share&&(!navigator.canShare||navigator.canShare(payload))){await navigator.share(payload);return}saveFile(file)}catch(err){if(err?.name!=='AbortError')say(`Photo share failed: ${err.message||err}`)}}
async function saveCurrent(){try{const file=await photoFile(),payload={files:[file]};if(navigator.share&&(!navigator.canShare||navigator.canShare(payload))){await navigator.share(payload);return}saveFile(file)}catch(err){if(err?.name!=='AbortError')say(`Photo save failed: ${err.message||err}`)}}
function saveFile(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);say('Photo saved separately')}
function selectedKey(){
 try{if(typeof selected!=='undefined'&&selected!==null&&selected!=='')return selected}catch{}
 try{if(window.selected!==null&&window.selected!==undefined&&window.selected!=='')return window.selected}catch{}
 return null;
}
async function photosFor(key){
 if(typeof window.getPhotos!=='function')throw Error('Photo storage is unavailable');
 let p=await window.getPhotos(key);
 if((!p||!p.length)&&typeof key==='string'){
   const m=key.match(/\d+/);if(m){const n=Number(m[0]);if(Number.isFinite(n))p=await window.getPhotos(n)}
 }
 return p||[];
}
async function openViewer(key,index=0){try{ensureViewer();const photos=await photosFor(key);if(!photos?.length){say('No saved photos found for this item');return}revokeUrls();currentPhotos=photos.filter(p=>p?.blob);if(!currentPhotos.length){say('Photo is not available on this device yet');return}currentUrls=currentPhotos.map(p=>URL.createObjectURL(p.blob));currentIndex=Math.max(0,Math.min(Number(index)||0,currentPhotos.length-1));const v=document.getElementById('fvPhotoViewer');v.classList.remove('hidden');v.style.display='flex';renderViewer()}catch(err){console.error('Photo viewer',err);say(`Photo viewer failed: ${err.message||err}`)}}
function enhancePreview(){const box=document.getElementById('photoPreview');if(!box)return;box.querySelectorAll('img').forEach((img,index)=>{img.dataset.fvViewer='1';img.style.cursor='zoom-in';img.setAttribute('role','button');img.setAttribute('tabindex','0');img.setAttribute('aria-label',`Open photo ${index+1} full screen`)})}
function previewIndex(img){const box=img.closest('#photoPreview');if(!box)return 0;return Math.max(0,[...box.querySelectorAll('img')].indexOf(img))}
// Delegated handlers survive re-rendering of photoPreview and cloud refreshes.
document.addEventListener('click',e=>{const img=e.target?.closest?.('#photoPreview img');if(!img)return;e.preventDefault();e.stopPropagation();const key=selectedKey();if(key===null){say('Select an inspection item first');return}openViewer(key,previewIndex(img))},true);
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const img=e.target?.closest?.('#photoPreview img');if(!img)return;e.preventDefault();const key=selectedKey();if(key!==null)openViewer(key,previewIndex(img))},true);
const observer=new MutationObserver(()=>enhancePreview());
function start(){ensureViewer();enhancePreview();observer.observe(document.documentElement,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.FIELDVERIFY_PHOTO_VIEWER={version:VERSION,open:openViewer};
console.info(`FieldVerify photo viewer ${VERSION} loaded`);
})();