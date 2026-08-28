(()=>{
'use strict';
const VERSION='10.25.24-touch-ers-no-popup';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
let down=null,loupeTimer=null;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function ensureStyle(){if(document.getElementById('fvErsTouchStyle'))return;const s=document.createElement('style');s.id='fvErsTouchStyle';s.textContent=`#fvErsLoupe{position:fixed;z-index:1700;width:min(310px,78vw);height:min(310px,78vw);border-radius:24px;overflow:hidden;border:6px solid #fff;background:#fff;box-shadow:0 10px 34px #000c;pointer-events:none;background-repeat:no-repeat;filter:contrast(1.28) saturate(1.08)}#fvErsLoupe:after{content:'';position:absolute;left:50%;top:50%;width:34px;height:34px;transform:translate(-50%,-50%);border:3px solid #ff2d55;border-radius:50%;box-shadow:0 0 0 2px #fff8}`;document.head.appendChild(s)}
function mapPoint(clientX,clientY){const r=map.getBoundingClientRect();if(!r.width||!r.height)return null;return{px:clientX-r.left,py:clientY-r.top,rect:r}}
function showLoupe(clientX,clientY){const p=mapPoint(clientX,clientY);if(!p)return;let l=document.getElementById('fvErsLoupe');if(!l){l=document.createElement('div');l.id='fvErsLoupe';document.body.appendChild(l)}const vw=document.documentElement.clientWidth,size=Math.min(310,Math.max(240,vw*.78)),scale=6.4,margin=12;let left=(vw-size)/2;l.style.width=size+'px';l.style.height=size+'px';l.style.left=Math.max(margin,left)+'px';l.style.top='14px';l.style.backgroundImage=`url("${String(plan.src).replace(/"/g,'%22')}")`;l.style.backgroundSize=`${p.rect.width*scale}px ${p.rect.height*scale}px`;l.style.backgroundPosition=`${size/2-p.px*scale}px ${size/2-p.py*scale}px`}
function hideLoupe(){const l=document.getElementById('fvErsLoupe');if(l&&l.parentNode)l.parentNode.removeChild(l)}
function moved(e){if(!down)return true;const dx=e.clientX-down.x,dy=e.clientY-down.y;return Math.sqrt(dx*dx+dy*dy)>12}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('.fv-num,.fv-ers-marker'))||(e.pointerType==='mouse'&&e.button!==0))return;down={x:e.clientX,y:e.clientY,moved:false};clearTimeout(loupeTimer);loupeTimer=setTimeout(()=>{if(!down||down.moved)return;showLoupe(down.x,down.y);down.loupe=true},100)},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;if(moved(e)){down.moved=true;clearTimeout(loupeTimer);hideLoupe()}else if(down.loupe)showLoupe(e.clientX,e.clientY)},{passive:true});
map.addEventListener('pointerup',()=>{clearTimeout(loupeTimer);down=null;setTimeout(hideLoupe,450)},{passive:true});
map.addEventListener('pointercancel',()=>{clearTimeout(loupeTimer);down=null;hideLoupe()},{passive:true});
filter.addEventListener('change',hideLoupe,true);document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter')hideLoupe()},true);
ensureStyle();window.FIELDVERIFY_ERS_TOUCH={version:VERSION};console.info(`FieldVerify ERS touch helper ${VERSION} loaded`);
})();