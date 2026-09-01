(()=>{
'use strict';
const VERSION='10.25.46-ipad-stability';

// iPad/Safari stability: render only the page being viewed and at a sane pixel size.
// This replaces the older 3200px render target, which can create very large canvases
// on detailed construction sheets and stall WebKit.
try{
  if(typeof renderPdfDrawing==='function'){
    renderPdfDrawing=async function stableRenderPdfDrawing(item,img){
      const pdf=await pdfInfo(item.blob);
      const pageNumber=Math.max(1,Math.min(pdf.numPages,item.pageNumber||1));
      const page=await pdf.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const mobile=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.maxTouchPoints>1;
      const maxDim=mobile?1700:2400;
      const scale=Math.min(2.2,maxDim/Math.max(base.width,base.height));
      const viewport=page.getViewport({scale});
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.ceil(viewport.width));
      canvas.height=Math.max(1,Math.ceil(viewport.height));
      const ctx=canvas.getContext('2d',{alpha:false});
      await page.render({canvasContext:ctx,viewport}).promise;
      const rendered=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PDF page could not be rendered')),'image/jpeg',0.9));
      if(img._customUrl)try{URL.revokeObjectURL(img._customUrl)}catch{}
      img._customUrl=URL.createObjectURL(rendered);
      img.src=img._customUrl;
      img.alt=`${item.name||'PDF drawing'} — page ${pageNumber} of ${pdf.numPages}`;
      canvas.width=1;canvas.height=1;
      try{page.cleanup()}catch{}
    };
  }
}catch(e){console.warn('Stable PDF renderer not installed',e)}

function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function lightweightPages(){
  const mgr=window.FIELDVERIFY_DRAWING_MANAGER;
  const filter=document.getElementById('itemFilter');
  const drawing=document.getElementById('drawingFilter');
  if(!mgr||!filter||!drawing)return;
  const category=filter.value;
  const project=String(typeof activeProjectId!=='undefined'?(activeProjectId||'legacy'):'legacy');
  const rows=(mgr.library?.()||[]).filter(x=>String(x.projectId)===project&&x.category===category).sort((a,b)=>(Number(a.pageNumber)||0)-(Number(b.pageNumber)||0));
  if(!rows.length){try{toast(`No ${category||'project'} drawing pages loaded`)}catch{};return}
  document.getElementById('fvLitePagesModal')?.remove();
  const modal=document.createElement('div');modal.id='fvLitePagesModal';modal.className='fv-drawing-modal';
  modal.innerHTML=`<div class="fv-drawing-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h2 style="margin:0">${esc(category)} Pages</h2><div style="font-size:12px;color:#687480">Lightweight page list — tap a page to open it.</div></div><button id="fvLiteClose" style="padding:10px;background:#e7edf4">Close</button></div><div id="fvLiteList" style="display:grid;gap:8px;margin-top:12px"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#fvLiteClose').onclick=()=>modal.remove();
  const list=modal.querySelector('#fvLiteList');
  for(const x of rows){
    const b=document.createElement('button');b.type='button';b.style.cssText='padding:14px;text-align:left;background:#eef3f8;color:#16202a;border:2px solid #d7dee7;border-radius:12px';
    const label=x.pageCount>1?`${x.baseDescription||x.description||'Drawing'} · Page ${x.pageNumber} of ${x.pageCount}`:(x.description||x.name||'Drawing');
    b.textContent=label;
    if(x.id===drawing.value)b.style.borderColor='#16803d';
    b.onclick=()=>{drawing.value=x.id;drawing.dispatchEvent(new Event('change',{bubbles:true}));modal.remove()};
    list.appendChild(b);
  }
}

function replacePagesButton(){
  const old=document.getElementById('drawingPagesBtn');
  if(!old||old.dataset.fvStable==='1')return;
  const b=old.cloneNode(true);b.dataset.fvStable='1';b.onclick=e=>{e.preventDefault();e.stopPropagation();lightweightPages()};
  old.replaceWith(b);
}

function install(){replacePagesButton();}
install();setTimeout(install,500);setTimeout(install,1500);
document.addEventListener('change',e=>{if(e.target?.id==='itemFilter')setTimeout(install,50)},true);
window.FIELDVERIFY_IPAD_STABILITY={version:VERSION,pages:lightweightPages};
console.info(`FieldVerify iPad stability ${VERSION} loaded`);
})();
