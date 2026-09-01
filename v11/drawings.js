import{listDrawings,saveDrawingMeta,saveFile,getDrawingFile,getActiveDrawing,setActiveDrawing,newId}from'./storage.js';

let pdfModule=null;
async function pdfjs(){if(!pdfModule){pdfModule=await import('../pdf.min.mjs');pdfModule.GlobalWorkerOptions.workerSrc=new URL('../pdf.worker.min.mjs',import.meta.url).href}return pdfModule}
const isPdf=x=>String(x?.type||'').includes('pdf')||String(x?.name||'').toLowerCase().endsWith('.pdf');
const cleanName=name=>String(name||'Drawing').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Drawing';

export class DrawingManager{
  constructor({img,statusEl,onChange}){this.img=img;this.statusEl=statusEl;this.onChange=onChange;this.projectId='';this.category='';this.token=0;this.objectUrl=null;this.meta=[]}
  setContext(projectId,category){this.projectId=String(projectId||'');this.category=String(category||'');this.token++;this.meta=[];this.clearDisplay('Choose a drawing to load')}
  status(text){if(this.statusEl)this.statusEl.textContent=text}
  label(row){if(!row)return'No drawing';if(Number(row.pageCount)>1)return`${row.baseDescription||row.description||'Drawing'} · Page ${row.pageNumber} of ${row.pageCount}`;return row.description||row.name||'Drawing'}
  releaseUrl(){if(this.objectUrl){try{URL.revokeObjectURL(this.objectUrl)}catch{}this.objectUrl=null}}
  clearDisplay(text='No drawing loaded'){this.releaseUrl();this.img.removeAttribute('src');this.img.alt=text;this.status(text);this.onChange?.(null)}

  /* Work-type selection loads metadata only. No app-bundled project drawings exist in v11. */
  async loadMetadata(){
    if(!this.projectId||!this.category){this.meta=[];return[]}
    this.meta=await listDrawings(this.projectId,this.category);
    return this.meta
  }
  rows(){return this.meta.slice()}
  activeId(){return getActiveDrawing(this.projectId,this.category)}

  /* Actual drawing bytes are loaded only after the user explicitly selects a drawing/page. */
  async openById(id){
    const row=this.meta.find(x=>String(x.id)===String(id));if(!row)return null;
    setActiveDrawing(this.projectId,this.category,row.id);
    await this.open(row);return row
  }

  async open(row){
    const my=++this.token;this.status(`Loading ${this.label(row)}…`);
    try{
      const stored=await getDrawingFile(row);if(my!==this.token)return;
      if(!stored?.blob)throw Error('Drawing file is not stored on this device');
      if(isPdf(stored))await this.renderPdf(stored,row,my);else await this.renderImage(stored,row,my);
      if(my!==this.token)return;this.status(this.label(row));this.onChange?.(row)
    }catch(err){if(my===this.token){console.error(err);this.status(`Drawing error: ${err.message||err}`)}}
  }
  async renderImage(stored,row,my){const url=URL.createObjectURL(stored.blob);if(my!==this.token){URL.revokeObjectURL(url);return}this.releaseUrl();this.objectUrl=url;this.img.src=url;this.img.alt=this.label(row)}
  async renderPdf(stored,row,my){
    const lib=await pdfjs();if(my!==this.token)return;
    const bytes=await stored.blob.arrayBuffer();if(my!==this.token)return;
    const pdf=await lib.getDocument({data:bytes}).promise;if(my!==this.token){try{pdf.destroy()}catch{}return}
    const pageNumber=Math.max(1,Math.min(pdf.numPages,Number(row.pageNumber)||1));const page=await pdf.getPage(pageNumber);
    if(my!==this.token){try{page.cleanup()}catch{};try{pdf.destroy()}catch{};return}
    const base=page.getViewport({scale:1}),touch=navigator.maxTouchPoints>1,maxDim=touch?1500:2200,scale=Math.min(2,maxDim/Math.max(base.width,base.height)),viewport=page.getViewport({scale});
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;if(my!==this.token){canvas.width=1;canvas.height=1;try{page.cleanup()}catch{};try{pdf.destroy()}catch{};return}
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PDF page render failed')),'image/jpeg',.87));canvas.width=1;canvas.height=1;try{page.cleanup()}catch{};try{pdf.destroy()}catch{};
    if(my!==this.token)return;const url=URL.createObjectURL(blob);this.releaseUrl();this.objectUrl=url;this.img.src=url;this.img.alt=`${this.label(row)} — page ${pageNumber}`
  }

  async addFile(file,category=this.category,description=''){
    if(!this.projectId||!category)throw Error('Choose a project and work type first');
    const storageId=newId('fv11-file'),now=new Date().toISOString();let pageCount=1;
    if(isPdf(file)){const lib=await pdfjs(),pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;pageCount=pdf.numPages||1;try{pdf.destroy()}catch{}}
    await saveFile({id:storageId,name:file.name,type:file.type||(isPdf(file)?'application/pdf':''),blob:file,date:now});
    const base=description.trim()||cleanName(file.name),rows=[];
    for(let pageNumber=1;pageNumber<=pageCount;pageNumber++){
      const row={id:newId('fv11-drawing'),storageId,projectId:this.projectId,category:String(category),description:pageCount>1?`${base} · Page ${pageNumber}`:base,baseDescription:base,name:file.name,date:now,pageNumber,pageCount,source:'v11'};
      await saveDrawingMeta(row);rows.push(row)
    }
    await this.loadMetadata();return rows
  }
}
