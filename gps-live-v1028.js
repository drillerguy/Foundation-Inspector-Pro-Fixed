(()=>{
'use strict';
let fvHeading=null,fvInitialCenterPending=true,fvOrientationBound=false;
function addGpsStyles(){if(document.getElementById('fvGpsLiveStyle'))return;const s=document.createElement('style');s.id='fvGpsLiveStyle';s.textContent=`
.gps-arrow{position:absolute;width:34px;height:34px;transform:translate(-50%,-50%) rotate(var(--fv-heading,0deg));transform-origin:50% 50%;z-index:16;filter:drop-shadow(0 2px 4px #0008);transition:left .35s linear,top .35s linear,transform .25s linear;will-change:left,top,transform}
.gps-arrow:before{content:'';position:absolute;left:7px;top:2px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:27px solid #0a84ff}
.gps-arrow:after{content:'';position:absolute;left:11px;top:8px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:17px solid #fff}
.accuracy{transition:left .35s linear,top .35s linear,width .5s ease,height .5s ease}
`;
document.head.appendChild(s)}
function orientationHandler(e){let h=null;if(Number.isFinite(e.webkitCompassHeading))h=e.webkitCompassHeading;else if(Number.isFinite(e.alpha))h=(360-e.alpha)%360;if(Number.isFinite(h))fvHeading=h}
async function enableCompass(){if(fvOrientationBound)return;try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const state=await DeviceOrientationEvent.requestPermission();if(state!=='granted')return}window.addEventListener('deviceorientation',orientationHandler,true);window.addEventListener('deviceorientationabsolute',orientationHandler,true);fvOrientationBound=true}catch{}}
function headingFor(p){const gpsHeading=Number(p?.coords?.heading);if(Number.isFinite(gpsHeading)&&gpsHeading>=0)return gpsHeading;return Number.isFinite(fvHeading)?fvHeading:0}
function redrawGpsArrow(){const p=lastPosition,q=p&&project(p.coords.latitude,p.coords.longitude),layer=$('gpsLayer');if(!q){layer.innerHTML='';return}const m=$('map'),probe=project(p.coords.latitude,p.coords.longitude+.00001),meters=haversine(p.coords.latitude,p.coords.longitude,p.coords.latitude,p.coords.longitude+.00001),pct=Math.max(.00001,Math.abs(probe.x-q.x)),pxPerMeter=(m.offsetWidth*pct/100)/Math.max(.01,meters),r=Math.max(30,Math.min(500,p.coords.accuracy*pxPerMeter*2)),heading=headingFor(p);layer.innerHTML=`<div class="accuracy" style="left:${q.x}%;top:${q.y}%;width:${r}px;height:${r}px"></div><div class="gps-arrow" aria-label="Your live GPS position" style="left:${q.x}%;top:${q.y}%;--fv-heading:${heading}deg"></div>`}
const oldStopGPS=stopGPS;
startGPS=async function(){
 oldStopGPS();gpsSamples=[];bestPosition=null;lastPosition=null;fvInitialCenterPending=true;addGpsStyles();enableCompass();
 $('gpsStatus').textContent='GPS searching for live position…';$('accuracyStatus').textContent='Collecting readings…';
 const opts={enableHighAccuracy:true,maximumAge:0,timeout:20000};
 watchId=navigator.geolocation.watchPosition(updateGPS,geoError,opts);
 refreshTimer=setInterval(()=>navigator.geolocation.getCurrentPosition(updateGPS,()=>{},opts),3000);
 $('locate').textContent='Stop GPS';$('locate').onclick=stopGPS;
};
stopGPS=function(){if(watchId!=null)navigator.geolocation.clearWatch(watchId);watchId=null;if(refreshTimer)clearInterval(refreshTimer);refreshTimer=null;$('gpsStatus').textContent='GPS off';$('locate').textContent='Start GPS';$('locate').onclick=startGPS};
updateGPS=function(p){
 if(!p?.coords||!Number.isFinite(p.coords.latitude)||!Number.isFinite(p.coords.longitude)||!Number.isFinite(p.coords.accuracy)||p.coords.accuracy<=0)return;
 const now=Date.now(),previous=lastPosition;
 if(previous&&p.timestamp<previous.timestamp-1000)return;
 if(previous){const seconds=Math.max(1,((p.timestamp||now)-(previous.timestamp||now))/1000),jump=haversine(previous.coords.latitude,previous.coords.longitude,p.coords.latitude,p.coords.longitude);if(jump>Math.max(120,seconds*35)&&p.coords.accuracy>=previous.coords.accuracy*1.25){$('gpsStatus').textContent='GPS outlier ignored';return}}
 lastPosition=p;lastGoodAt=now;gpsSamples.push(p);gpsSamples=gpsSamples.filter(x=>now-(x.timestamp||now)<30000).slice(-20);bestPosition=gpsSamples.reduce((best,x)=>!best||x.coords.accuracy<best.coords.accuracy?x:best,null);
 const best=gpsSnapshot(),age=Math.max(0,Math.round((now-(p.timestamp||now))/1000)),moved=previous?Math.round(haversine(previous.coords.latitude,previous.coords.longitude,p.coords.latitude,p.coords.longitude)*3.28084):0;
 $('gpsStatus').textContent=`GPS live · ${gpsQuality(p.coords.accuracy)}`;
 $('accuracyStatus').textContent=`Now ±${Math.round(p.coords.accuracy*3.28084)} ft · best ±${Math.round(best.accuracy*3.28084)} ft${moved?` · moved ${moved} ft`:''}${age>2?` · ${age}s old`:''}`;
 const b=nearestUnfinished(p.coords.latitude,p.coords.longitude);nearest=b?.n??null;if(selected==null)selected=nearest;renderPins();redrawGpsArrow();showTarget();
 if(fvInitialCenterPending){fvInitialCenterPending=false;setTimeout(()=>centerOnGPS(),50)}
};
drawBlueDot=redrawGpsArrow;
const oldCenterOnGPS=centerOnGPS;
centerOnGPS=function(){oldCenterOnGPS();fvInitialCenterPending=false};
document.addEventListener('DOMContentLoaded',()=>{addGpsStyles();const btn=$('locate');if(btn&&btn.textContent.includes('Start'))btn.onclick=startGPS});
})();
