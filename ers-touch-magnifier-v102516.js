(()=>{
'use strict';
const VERSION='10.25.23-touch-ers-2';
const filter=document.getElementById('itemFilter');
const map=document.getElementById('map');
const plan=document.getElementById('planImage');
if(!filter||!map||!plan)return;
const KEY='fieldVerifyTouchMarkersV102516';
let down=null,loupeTimer=null,ignoreClickUntil=0;
function active(){return filter.value==='ERS'||filter.value==='Tieback'}
function projectId(){try{return String(typeof activeProjectId!=='undefined'&&activeProjectId||'legacy')}catch{return'legacy'}}
function drawingId(){return document.getElementById('drawingFilter')?.value||plan.src||'drawing'}
function scope(){return `${projectId()}|${filter.value}|${drawingId()}`}
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function write(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
function markers(){const x=read()[scope()];return Array.isArray(x)?x:[]}
function saveMarkers(list){const x=read();x[scope()]=list;write(x)}
function ensureStyle(){if(document.getElementById('fvErsTouchStyle'))return;const s=document.createElement('style');s.id='fvErsTouchStyle';s.textContent=`
#fvErsTouchLayer{position:absolute;inset:0;z-index:24;pointer-events:none;line-height:normal}
#fvErsTouchLayer .fv-ers-marker{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;border:3px solid #fff;background:#083a73;color:#fff;box-shadow:0 2px 9px #0009;font-size:14px;font-weight:900;line-height:38px;text-align:center;padding:0;pointer-events:auto;touch-action:manipulation}
#fvErsTouchLayer .fv-ers-marker.fv-picked{background:#7b3fc6;outline:4px solid #fff8}
#fvErsLoupe{position:fixed;z-index:1700;width:min(310px,78vw);height:min(310px,78vw);border-radius:24px;overflow:hidden;border:6px solid #fff;background:#fff;box-shadow:0 10px 34px #000c;pointer-events:none;background-repeat:no-repeat;image-rendering:auto;filter:contrast(1.28) saturate(1.08)}
#fvErsLoupe:after{content:'';position:absolute;left:50%;top:50%;width:34px;height:34px;transform:translate(-50%,-50%);border:3px solid #ff2d55;border-radius:50%;box-shadow:0 0 0 2px #fff8}
#fvErsAssign{position:fixed;z-index:1710;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));margin:auto;max-width:520px;background:#fff;color:#16202a;border-radius:18px;padding:16px;box-shadow:0 8px 35px #000b;line-height:normal}
#fvErsAssign h3{margin:0 0 6px;font-size:20px}#fvErsAssign p{margin:0 0 10px;font-size:13px;color:#5d6874}
#fvErsAssign input{width:100%;font-size:28px;font-weight:900;padding:13px;border:2px solid #9ba7b4;border-radius:11px;margin-bottom:10px}
#fvErsAssign .fv-actions{display:grid;grid-template-columns:1fr 1.35fr;gap:8px}#fvErsAssign button{min-height:50px;border-radius:11px;font-weight:900;padding:10px}#fvErsCancel{background:#e7edf4;color:#16202a}#fvErsSave{background:#16803d;color:#fff}
`;
document.head.appendChild(s)}
function layer(){let l=document.getElementById('fvErsTouchLayer');if(!l){l=document.createElement('div');l.id='fvErsTouchLayer';map.appendChild(l)}return l}
function selectNumber(n,b){try{document.querySelectorAll('#fvErsTouchLayer .fv-picked').forEach(x=>x.classList.remove('fv-picked'));if(b)b.classList.add('fv-picked');if(typeof records!=='undefined'&&typeof rec==='function'){records[n]={...rec(n),itemType:filter.value,itemLabel:String(n)};if(typeof persist==='function')persist()}if(typeof selected!=='undefined')selected=n;if(typeof showTarget==='function')showTarget();const q=document.getElementById('search');if(q)q.value=String(n);if(typeof toast==='function')toast(`${filter.value} ${n} selected`)}catch(e){console.warn('ERS touch marker select failed',e)}}
function render(){const l=layer();while(l.firstChild)l.removeChild(l.firstChild);if(!active())return;for(const m of markers()){const b=document.createElement('button');b.type='button';b.className='fv-ers-marker';b.textContent=String(m.n);b.style.left=m.x+'%';b.style.top=m.y+'%';b.dataset.n=String(m.n);b.setAttribute('aria-label',`${filter.value} ${m.n}`);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectNumber(Number(m.n),b)});l.appendChild(b)}}
function mapPoint(clientX,clientY){const r=map.getBoundingClientRect();if(!r.width||!r.height)return null;return{x:(clientX-r.left)/r.width*100,y:(clientY-r.top)/r.height*100,px:clientX-r.left,py:clientY-r.top,rect:r}}
function showLoupe(clientX,clientY){const p=mapPoint(clientX,clientY);if(!p)return;let l=document.getElementById('fvErsLoupe');if(!l){l=document.createElement('div');l.id='fvErsLoupe';document.body.appendChild(l)}const vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;const size=Math.min(310,Math.max(240,vw*.78));const scale=6.4,margin=12;let left=(vw-size)/2,top=margin+8;if(vh<720)top=8;l.style.width=size+'px';l.style.height=size+'px';l.style.left=Math.max(margin,left)+'px';l.style.top=top+'px';l.style.backgroundImage=`url("${String(plan.src).replace(/"/g,'%22')}")`;l.style.backgroundSize=`${p.rect.width*scale}px ${p.rect.height*scale}px`;l.style.backgroundPosition=`${size/2-p.px*scale}px ${size/2-p.py*scale}px`}
function hideLoupe(){const l=document.getElementById('fvErsLoupe');if(l&&l.parentNode)l.parentNode.removeChild(l)}
function closeAssign(){const a=document.getElementById('fvErsAssign');if(a&&a.parentNode)a.parentNode.removeChild(a);hideLoupe()}
function assignAt(p){const old=document.getElementById('fvErsAssign');if(old&&old.parentNode)old.parentNode.removeChild(old);const c=document.createElement('div');c.id='fvErsAssign';c.innerHTML=`<h3>Make this ${filter.value} clickable</h3><p>The number stays enlarged above. Enter it once, then this location remains clickable like a caisson.</p><input id="fvErsNumber" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Number"><div class="fv-actions"><button id="fvErsCancel" type="button">Cancel</button><button id="fvErsSave" type="button">MAKE CLICKABLE</button></div>`;document.body.appendChild(c);const input=c.querySelector('#fvErsNumber');input.focus();c.querySelector('#fvErsCancel').onclick=closeAssign;const save=()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>9999){if(typeof toast==='function')toast('Enter the number shown in the magnifier');input.focus();return}const list=markers().filter(x=>Number(x.n)!==n);list.push({n,x:+p.x.toFixed(4),y:+p.y.toFixed(4)});saveMarkers(list);closeAssign();render();const buttons=layer().querySelectorAll('.fv-ers-marker');let b=null;for(const x of buttons){if(Number(x.dataset.n)===n){b=x;break}}selectNumber(n,b)};c.querySelector('#fvErsSave').onclick=save;input.addEventListener('keydown',e=>{if(e.key==='Enter')save()})}
function moved(e){if(!down)return true;const dx=e.clientX-down.x,dy=e.clientY-down.y;return Math.sqrt(dx*dx+dy*dy)>12}
map.addEventListener('pointerdown',e=>{if(!active()||(e.target.closest&&e.target.closest('.fv-ers-marker'))||(e.pointerType==='mouse'&&e.button!==0))return;down={x:e.clientX,y:e.clientY,moved:false};clearTimeout(loupeTimer);loupeTimer=setTimeout(()=>{if(!down||down.moved)return;showLoupe(down.x,down.y);down.loupe=true},100)},{passive:true});
map.addEventListener('pointermove',e=>{if(!down)return;if(moved(e)){down.moved=true;clearTimeout(loupeTimer);hideLoupe()}else if(down.loupe)showLoupe(e.clientX,e.clientY)},{passive:true});
map.addEventListener('pointercancel',()=>{clearTimeout(loupeTimer);down=null;hideLoupe()},{passive:true});
map.addEventListener('pointerup',e=>{clearTimeout(loupeTimer);if(!down)return;const d=down;down=null;if(d.moved){hideLoupe();return}const p=mapPoint(e.clientX,e.clientY);if(!p){hideLoupe();return}showLoupe(e.clientX,e.clientY);ignoreClickUntil=Date.now()+700;setTimeout(()=>assignAt(p),80)},{passive:true});
map.addEventListener('click',e=>{if(active()&&Date.now()<ignoreClickUntil&&!(e.target.closest&&e.target.closest('.fv-ers-marker'))){e.preventDefault();e.stopImmediatePropagation()}},true);
filter.addEventListener('change',()=>{closeAssign();setTimeout(render,60);if(active()&&typeof toast==='function')setTimeout(()=>toast(`Tap a ${filter.value} number box to magnify it and make it clickable`),150)},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter'){closeAssign();setTimeout(render,120)}},true);
new MutationObserver(()=>setTimeout(render,100)).observe(plan,{attributes:true,attributeFilter:['src']});
ensureStyle();render();window.FIELDVERIFY_ERS_TOUCH={version:VERSION,refresh:render};console.info(`FieldVerify ERS touch magnifier ${VERSION} loaded`);
})();