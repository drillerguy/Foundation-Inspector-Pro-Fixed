(()=>{
'use strict';
const BUILD='10.25.85-gps-follow-arrow';
let compassHeading=null,motionHeading=null,prevGeo=null,orientationBound=false;

function norm(v){v=Number(v);if(!Number.isFinite(v))return null;v%=360;if(v<0)v+=360;return v}
function bearing(lat1,lon1,lat2,lon2){
  const a=lat1*Math.PI/180,b=lat2*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const y=Math.sin(dLon)*Math.cos(b);
  const x=Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dLon);
  return norm(Math.atan2(y,x)*180/Math.PI);
}
function distance(a,b){
  try{
    if(typeof haversine==='function')return haversine(a.coords.latitude,a.coords.longitude,b.coords.latitude,b.coords.longitude);
  }catch{}
  return 0;
}
function onOrientation(e){
  let h=null;
  if(Number.isFinite(e.webkitCompassHeading))h=Number(e.webkitCompassHeading);
  else if(e.absolute&&Number.isFinite(e.alpha)){
    const ang=Number(screen?.orientation?.angle ?? window.orientation ?? 0)||0;
    h=360-Number(e.alpha)+ang;
  }
  h=norm(h);
  if(h!=null){compassHeading=h;try{drawBlueDot()}catch{}}
}
async function enableCompass(){
  try{
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      const p=await DeviceOrientationEvent.requestPermission();
      if(p!=='granted')return false;
    }
    if(!orientationBound){
      window.addEventListener('deviceorientation',onOrientation,true);
      orientationBound=true;
    }
    return true;
  }catch(e){console.warn('FieldVerify compass permission',e);return false}
}
function trueHeading(){
  try{
    const p=lastPosition;
    if(p&&Number.isFinite(p.coords.heading)&&Number(p.coords.heading)>=0){
      const speed=Number(p.coords.speed);
      if(!Number.isFinite(speed)||speed>.35)return norm(p.coords.heading);
    }
  }catch{}
  return compassHeading!=null?compassHeading:motionHeading;
}
function mapHeading(h,p,q){
  if(h==null||!p||!q)return null;
  try{
    if(typeof project!=='function')return h;
    const rad=h*Math.PI/180,lat=Number(p.coords.latitude),lon=Number(p.coords.longitude),eps=.00001;
    const dLat=Math.cos(rad)*eps;
    const cosLat=Math.max(.2,Math.cos(lat*Math.PI/180));
    const dLon=Math.sin(rad)*eps/cosLat;
    const q2=project(lat+dLat,lon+dLon);
    if(!q2)return h;
    const dx=q2.x-q.x,dy=q2.y-q.y;
    if(Math.abs(dx)+Math.abs(dy)<1e-9)return h;
    return norm(Math.atan2(dx,-dy)*180/Math.PI);
  }catch{return h}
}
function arrowSvg(angle){
  const a=Number.isFinite(angle)?angle:0;
  const opacity=Number.isFinite(angle)?1:.72;
  return '<svg class="fv-gps-arrow" viewBox="0 0 44 44" style="left:VARX%;top:VARY%;transform:translate(-50%,-50%) rotate('+a+'deg);opacity:'+opacity+'"><path d="M22 3 L37 38 L22 31 L7 38 Z" fill="#0a84ff" stroke="#ffffff" stroke-width="3.2" stroke-linejoin="round"/></svg>';
}
function installStyle(){
  if(document.getElementById('fvGpsFollowStyle'))return;
  const s=document.createElement('style');s.id='fvGpsFollowStyle';
  s.textContent='.fv-gps-arrow{position:absolute;width:42px;height:42px;z-index:18;filter:drop-shadow(0 2px 5px #0009);transform-origin:50% 50%;transition:left .35s linear,top .35s linear,transform .22s linear}.accuracy{transition:left .35s linear,top .35s linear,width .35s linear,height .35s linear}';
  document.head.appendChild(s);
}
function updateMotionHeading(){
  let p=null;try{p=lastPosition}catch{}
  if(!p)return;
  if(prevGeo&&p.timestamp!==prevGeo.timestamp){
    const d=distance(prevGeo,p);
    if(d>=1){
      const h=bearing(prevGeo.coords.latitude,prevGeo.coords.longitude,p.coords.latitude,p.coords.longitude);
      if(h!=null)motionHeading=h;
    }
  }
  if(!prevGeo||p.timestamp!==prevGeo.timestamp)prevGeo=p;
}
function drawArrow(){
  installStyle();
  updateMotionHeading();
  let p=null;try{p=lastPosition}catch{}
  const layer=document.getElementById('gpsLayer');
  if(!layer)return;
  let q=null;
  try{q=p&&typeof project==='function'?project(p.coords.latitude,p.coords.longitude):null}catch{}
  if(!q){layer.innerHTML='';return}
  let r=42;
  try{
    const m=document.getElementById('map'),probe=project(p.coords.latitude,p.coords.longitude+.00001),
      meters=haversine(p.coords.latitude,p.coords.longitude,p.coords.latitude,p.coords.longitude+.00001),
      pct=Math.max(.00001,Math.abs(probe.x-q.x)),pxPerMeter=(m.offsetWidth*pct/100)/meters;
    r=Math.max(30,p.coords.accuracy*pxPerMeter*2);
  }catch{}
  const h=mapHeading(trueHeading(),p,q);
  const acc='<div class="accuracy" style="left:'+q.x+'%;top:'+q.y+'%;width:'+r+'px;height:'+r+'px"></div>';
  const arrow=arrowSvg(h).replace('VARX',q.x).replace('VARY',q.y);
  layer.innerHTML=acc+arrow;
}
function forceFollow(){
  try{autoCenter=true}catch{}
  try{if(lastPosition&&typeof centerOnGPS==='function')centerOnGPS()}catch{}
}
function hook(){
  installStyle();
  try{drawBlueDot=drawArrow}catch{}
  document.addEventListener('click',e=>{
    const locate=e.target&&e.target.closest&&e.target.closest('#locate');
    const center=e.target&&e.target.closest&&e.target.closest('#mapCenter');
    if(locate){
      const txt=String(locate.textContent||'').toLowerCase();
      if(!txt.includes('stop')){forceFollow();enableCompass()}
    }
    if(center){forceFollow();enableCompass()}
  },true);
  // Mark the center button as follow mode when GPS is active.
  const b=document.getElementById('mapCenter');
  if(b){b.title='Follow my GPS position';b.setAttribute('aria-label','Follow my GPS position')}
  try{drawArrow()}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
window.FIELDVERIFY_GPS_FOLLOW={build:BUILD,enableCompass,follow:forceFollow,heading:()=>trueHeading()};
})();