/* FieldVerify Pro v10.24 - manager drawing gesture lock
   When Manager Review is in "Circle Drawing Area" mode, lock the drawing/page
   so a one-finger drag draws the request bubble instead of panning/scrolling.
*/
(()=>{
'use strict';
const VERSION='10.24-manager-draw-lock-1';
let locked=false,old=null;
function layer(){return document.getElementById('fvFieldRequestLayer')}
function map(){return document.getElementById('map')}
function isDrawing(){const l=layer();return !!document.getElementById('fvDrawHint')&&!!l&&l.style.pointerEvents==='auto'}
function prevent(e){if(!locked)return;e.preventDefault();e.stopPropagation()}
function lock(){
 if(locked)return;const l=layer(),m=map();if(!l)return;locked=true;
 old={
  htmlOverflow:document.documentElement.style.overflow,
  htmlOverscroll:document.documentElement.style.overscrollBehavior,
  bodyOverflow:document.body.style.overflow,
  bodyOverscroll:document.body.style.overscrollBehavior,
  bodyTouch:document.body.style.touchAction,
  layerTouch:l.style.touchAction,
  layerOverscroll:l.style.overscrollBehavior,
  mapTouch:m?.style.touchAction||'',
  mapOverscroll:m?.style.overscrollBehavior||'',
  mapUserSelect:m?.style.userSelect||''
 };
 document.documentElement.style.overflow='hidden';
 document.documentElement.style.overscrollBehavior='none';
 document.body.style.overflow='hidden';
 document.body.style.overscrollBehavior='none';
 document.body.style.touchAction='none';
 l.style.touchAction='none';
 l.style.overscrollBehavior='none';
 if(m){m.style.touchAction='none';m.style.overscrollBehavior='none';m.style.userSelect='none'}
}
function unlock(){
 if(!locked)return;const l=layer(),m=map();locked=false;
 if(old){
  document.documentElement.style.overflow=old.htmlOverflow;
  document.documentElement.style.overscrollBehavior=old.htmlOverscroll;
  document.body.style.overflow=old.bodyOverflow;
  document.body.style.overscrollBehavior=old.bodyOverscroll;
  document.body.style.touchAction=old.bodyTouch;
  if(l){l.style.touchAction=old.layerTouch;l.style.overscrollBehavior=old.layerOverscroll}
  if(m){m.style.touchAction=old.mapTouch;m.style.overscrollBehavior=old.mapOverscroll;m.style.userSelect=old.mapUserSelect}
 }
 old=null;
}
function sync(){isDrawing()?lock():unlock()}
// Safari/iOS needs non-passive handlers or the browser will still pan the page.
for(const type of ['touchmove','gesturestart','gesturechange','wheel'])document.addEventListener(type,prevent,{capture:true,passive:false});
document.addEventListener('pointermove',e=>{if(locked&&e.pointerType==='touch')e.preventDefault()},{capture:true,passive:false});
document.addEventListener('pointerup',()=>setTimeout(sync,0),true);
document.addEventListener('pointercancel',()=>setTimeout(sync,0),true);
const obs=new MutationObserver(()=>setTimeout(sync,0));
function start(){obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});setInterval(sync,500);sync()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.FIELDVERIFY_MANAGER_DRAW_LOCK={version:VERSION,lock,unlock};
console.info(`FieldVerify manager draw lock ${VERSION} loaded`);
})();
