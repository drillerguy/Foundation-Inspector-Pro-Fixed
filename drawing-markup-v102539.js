(()=>{
'use strict';
const VERSION='10.25.39-drawing-markup';
const map=document.getElementById('map'),plan=document.getElementById('planImage'),controls=document.querySelector('.map-controls');
if(!map||!plan||!controls)return;
const STORE='fieldVerifyDrawingMarkupV102539';
let enabled=false,tool='pen',drawing=false,current=null,strokes=[];
function say(s){try{toast(s)}catch{}}
function drawingKey(){
  const df=document.getElementById('drawingFilter');
  const drawing=df&&df.value?df.value:'default';
  const project=typeof activeProjectId!=='undefined'?String(activeProjectId):'legacy';
  const type=document.getElementById('itemFilter')?.value||'all';
  return `${project}|${type}|${drawing}`;
}
function readAll(){try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function load(){const all=readAll();strokes=Array.isArray(all[drawingKey()])?all[drawingKey()]:[];redraw()}
function save(){const all=readAll();all[drawingKey()]=strokes;try{localStorage.setItem(STORE,JSON.stringify(all));say('Drawing markup saved')}catch{say('Could not save drawing markup')}}
function ensureStyle(){if(document.getElementById('fvMarkupStyle'))return;const s=document.createElement('style');s.id='fvMarkupStyle';s.textContent=`
#fvMarkupCanvas{position:absolute;inset:0;width:100%;height:100%;z-index:18;pointer-events:none;touch-action:auto}
#fvMarkupCanvas.active{pointer-events:auto;touch-action:none;cursor:crosshair}
#fvMarkupToggle.markup-on{background:#b42318!important}
#fvMarkupTools{position:absolute;left:10px;top:10px;z-index:29;display:none;gap:6px;align-items:center;flex-wrap:wrap;padding:7px;background:#fffffff2;border-radius:12px;box-shadow:0 2px 12px #0005;line-height:normal;max-width:calc(100% - 90px)}
#fvMarkupTools.show{display:flex}#fvMarkupTools button{min-height:42px;padding:8px 12px;background:#083a73;color:#fff;border-radius:9px;font-size:13px;font-weight:900}#fvMarkupTools button.active{background:#b42318}#fvMarkupTools .light{background:#e7edf4;color:#16202a}
` ;document.head.appendChild(s)}
function ensureUi(){
 ensureStyle();
 let c=document.getElementById('fvMarkupCanvas');if(!c){c=document.createElement('canvas');c.id='fvMarkupCanvas';map.appendChild(c)}
 let toggle=document.getElementById('fvMarkupToggle');if(!toggle){toggle=document.createElement('button');toggle.id='fvMarkupToggle';toggle.type='button';toggle.textContent='Draw';toggle.setAttribute('aria-label','Draw on drawing');controls.appendChild(toggle)}
 let tools=document.getElementById('fvMarkupTools');if(!tools){tools=document.createElement('div');tools.id='fvMarkupTools';tools.innerHTML='<button type="button" data-tool="pen" class="active">Pen</button><button type="button" data-tool="eraser">Eraser</button><button type="button" id="fvMarkupUndo" class="light">Undo</button><button type="button" id="fvMarkupClear" class="light">Clear</button><button type="button" id="fvMarkupSave">Save</button><button type="button" id="fvMarkupDone">Done</button>';map.parentElement?.appendChild(tools)}
 toggle.onclick=()=>setEnabled(!enabled);
 tools.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;tools.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b))});
 tools.querySelector('#fvMarkupUndo').onclick=()=>{if(strokes.length){strokes.pop();redraw();save()}};
 tools.querySelector('#fvMarkupClear').onclick=()=>{if(!strokes.length)return;if(confirm('Clear all markup from this drawing page?')){strokes=[];redraw();save()}};
 tools.querySelector('#fvMarkupSave').onclick=save;
 tools.querySelector('#fvMarkupDone').onclick=()=>{save();setEnabled(false)};
 c.addEventListener('pointerdown',pointerDown,{passive:false});c.addEventListener('pointermove',pointerMove,{passive:false});c.addEventListener('pointerup',pointerUp,{passive:false});c.addEventListener('pointercancel',pointerUp,{passive:false});
 window.addEventListener('resize',sizeCanvas);plan.addEventListener('load',()=>setTimeout(()=>{sizeCanvas();load()},50));
 document.addEventListener('change',e=>{if(e.target&&e.target.id==='drawingFilter'){if(enabled)setEnabled(false);setTimeout(()=>{sizeCanvas();load()},100)}},true);
 document.getElementById('itemFilter')?.addEventListener('change',()=>setTimeout(()=>{sizeCanvas();load()},100),true);
 sizeCanvas();load();
}
function setEnabled(v){enabled=!!v;const c=document.getElementById('fvMarkupCanvas'),t=document.getElementById('fvMarkupToggle'),tools=document.getElementById('fvMarkupTools');c?.classList.toggle('active',enabled);t?.classList.toggle('markup-on',enabled);if(t)t.textContent=enabled?'Drawing':'Draw';tools?.classList.toggle('show',enabled);if(enabled)say('Draw mode on — use finger or Apple Pencil')}
function sizeCanvas(){const c=document.getElementById('fvMarkupCanvas');if(!c)return;const w=Math.max(1,Math.round(map.clientWidth)),h=Math.max(1,Math.round(plan.clientHeight||map.clientHeight));if(c.width!==w||c.height!==h){c.width=w;c.height=h}c.style.height=h+'px';redraw()}
function pos(e){const c=document.getElementById('fvMarkupCanvas'),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,p:e.pointerType==='pen'&&e.pressure>0?e.pressure:.5}}
function pointerDown(e){if(!enabled)return;e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);const p=pos(e);if(tool==='eraser'){eraseAt(p);drawing=true;return}current={points:[p]};strokes.push(current);drawing=true;redraw()}
function pointerMove(e){if(!enabled||!drawing)return;e.preventDefault();const p=pos(e);if(tool==='eraser'){eraseAt(p);return}if(!current)return;const last=current.points[current.points.length-1];if(!last||Math.hypot(p.x-last.x,p.y-last.y)>.001){current.points.push(p);redraw()}}
function pointerUp(e){if(!drawing)return;e.preventDefault();drawing=false;current=null;save()}
function eraseAt(p){const c=document.getElementById('fvMarkupCanvas');if(!c)return;const radius=18/Math.max(c.width,c.height);for(let i=strokes.length-1;i>=0;i--){const pts=strokes[i].points||[];if(pts.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<=radius)){strokes.splice(i,1);redraw();break}}}
function redraw(){const c=document.getElementById('fvMarkupCanvas');if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d11b1b';for(const s of strokes){const pts=s.points||[];if(!pts.length)continue;if(pts.length===1){ctx.beginPath();ctx.arc(pts[0].x*c.width,pts[0].y*c.height,3,0,Math.PI*2);ctx.fillStyle='#d11b1b';ctx.fill();continue}for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];ctx.beginPath();ctx.moveTo(a.x*c.width,a.y*c.height);ctx.lineTo(b.x*c.width,b.y*c.height);ctx.lineWidth=2+5*((a.p+b.p)/2||.5);ctx.stroke()}}}
ensureUi();
window.FIELDVERIFY_DRAWING_MARKUP={version:VERSION,enable:()=>setEnabled(true),disable:()=>setEnabled(false),save,load};
console.info(`FieldVerify drawing markup ${VERSION} loaded`);
})();