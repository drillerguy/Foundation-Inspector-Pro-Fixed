import{drawings,saveDrawings,getActiveDrawing,setActiveDrawing,getSetting,putSetting,newId}from'./storage.js';

let pdfModule=null;
async function pdfjs(){if(!pdfModule){pdfModule=await import('../pdf.min.mjs');pdfModule.GlobalWorkerOptions.workerSrc=new URL('../pdf.worker.min.mjs',import.meta.url).href}return pdfModule}
const isPdf=(fileOrRow)=>String(fileOrRow?.type||'').includes('pdf')||String(fileOrRow?.name||'').toLowerCase().endsWith('.pdf');
const cleanName=name=>String(name||'Drawing').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Drawing';

export class DrawingManager{
  constructor({img,statusEl,onChange}){this.img=img;this.statusEl=statusEl;this.onChange=onChange;this.projectId='legacy';this.category='Caisson';this.token=0;this.objectUrl=null;this.rendering=false}
  setContext(projectId,category){this.projectId=String(projectId);this.category=String(category);this.token++}
  allRows(){return drawings()}
  rows(){return this.allRows().filter(x=>String(x.projectId)===this.projectId&&String(x.category)===this.category).sort((a,b)=>(Number(a.pageNumber)||0)-(Number(b.pageNumber)||0)||String(a.description||'').localeCompare(String(b.description||'')))}
  activeId(){return getActiveDrawing(this.projectId,this.category)}
  activeRow(){const rows=this.rows(),id=this.activeId();return rows.find(x=>x.id===id)||rows[0]||null}
  label(row){if(!row)return'No drawing';if(Number(row.pageCount)>1)return`${row.baseDescription||row.description||'Drawing'} · Page ${row.pageNumber} of ${row.pageCount}`;return row.description||row.name||'Drawing'}
  async openActive(){const row=this.activeRow();if(!row){setActiveDrawing(this.projectId,this.category,'');this.showFallback();this.onChange?.(null);return null}setActiveDrawing(this.projectId,this.category,row.id);await this.open(row);return row}
  async openById(id){const row=this.rows().find(x=>x.id===id);if(!row)return null;setActiveDrawing(this.projectId,this.category,row.id);await this.open(row);return row}
  showFallback(){this.token++;this.releaseUrl();this.img.src='../caisson-plan.png';this.img.alt=this.category==='Caisson'?'Foundation caisson plan':`No ${this.category} drawing loaded`;this.status(`${this.category}: no project drawing loaded`)}
  status(text){if(this.statusEl)this.statusEl.textContent=text}
  releaseUrl(){if(this.objectUrl){try{URL.revokeObjectURL(this.objectUrl)}catch{}this.objectUrl=null}}
  async open(row){
    const my=++this.token;this.rendering=true;this.status(`Loading ${this.label(row)}…`);
    try{
      const stored=await getSetting(row.storageId||row.id);
      if(my!==this.token)return;
      if(!stored?.blob)throw Error('Drawing file is not stored on this device');
      if(isPdf(stored))await this.renderPdf(stored,row,my);else await this.renderImage(stored,row,my);
      if(my!==this.token)return;
      this.status(this.label(row));this.onChange?.(row);
    }catch(err){if(my===this.token){console.error(err);this.status(`Drawing error: ${err.message||err}`)}}finally{if(my===this.token)this.rendering=false}
  }
  async renderImage(stored,row,my){const url=URL.createObjectURL(stored.blob);if(my!==this.token){URL.revokeObjectURL(url);return}this.releaseUrl();this.objectUrl=url;this.img.src=url;this.img.alt=this.label(row)}
  async renderPdf(stored,row,my){
    const lib=await pdfjs();if(my!==this.token)return;
    const bytes=await stored.blob.arrayBuffer();if(my!==this.token)return;
    const pdf=await lib.getDocument({data:bytes}).promise;if(my!==this.token){try{pdf.destroy()}catch{}return}
    const pageNumber=Math.max(1,Math.min(pdf.numPages,Number(row.pageNumber)||Number(stored.pageNumber)||1));
    const page=await pdf.getPage(pageNumber);if(my!==this.token){try{page.cleanup()}catch{};try{pdf.destroy()}catch{};return}
    const base=page.getViewport({scale:1});const touch=navigator.maxTouchPoints>1;const maxDim=touch?1600:2200;const scale=Math.min(2.1,maxDim/Math.max(base.width,base.height));const viewport=page.getViewport({scale});
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;if(my!==this.token){canvas.width=1;canvas.height=1;try{page.cleanup()}catch{};try{pdf.destroy()}catch{};return}
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PDF page render failed')),'image/jpeg',.88));
    canvas.width=1;canvas.height=1;try{page.cleanup()}catch{};try{pdf.destroy()}catch{};
    if(my!==this.token)return;const url=URL.createObjectURL(blob);this.releaseUrl();this.objectUrl=url;this.img.src=url;this.img.alt=`${this.label(row)} — page ${pageNumber}`;
  }
  async addFile(file,category=this.category,description=''){
    const projectId=this.projectId;const storageId=newId('fv11-drawing-file');const now=new Date().toISOString();let pageCount=1;
    if(isPdf(file)){const lib=await pdfjs();const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;pageCount=pdf.numPages||1;try{pdf.destroy()}catch{}}
    await putSetting({id:storageId,name:file.name,type:file.type||(isPdf(file)?'application/pdf':''),blob:file,date:now,v11:true});
    const base=description.trim()||cleanName(file.name);const rows=[];
    for(let pageNumber=1;pageNumber<=pageCount;pageNumber++)rows.push({id:newId('fv11-drawing-page'),storageId,projectId,category,description:pageCount>1?`${base} · Page ${pageNumber}`:base,baseDescription:base,name:file.name,date:now,pageNumber,pageCount,v11:true});
    saveDrawings([...drawings(),...rows]);setActiveDrawing(projectId,category,rows[0].id);this.setContext(projectId,category);await this.open(rows[0]);return rows
  }
}
