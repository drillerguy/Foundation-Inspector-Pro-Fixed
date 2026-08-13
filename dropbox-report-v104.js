/* FieldVerify Pro Dropbox office-report workflow v10.4.2 */
(() => {
  'use strict';
  const VERSION='10.4.2';
  const safe=v=>String(v||'Project').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'Project';

  async function reportPhotos(n,r){
    const ids=[...new Set((Array.isArray(r?.photos)?r.photos:[]).map(String))];
    if(!ids.length)return[];
    const db=await openDB(),all=await allFromStore(db,'photos'),byId=new Map(all.filter(p=>p?.id).map(p=>[String(p.id),p]));
    const out=[];
    for(const id of ids){const p=byId.get(id);if(p?.blob)out.push(p)}
    return out;
  }

  async function image(blob,pdf){
    if(!(blob instanceof Blob)||!blob.size)throw Error('Photo data is missing');
    const u=URL.createObjectURL(blob);
    try{
      const img=await new Promise((res,rej)=>{const x=new Image();x.onload=()=>res(x);x.onerror=()=>rej(Error('Photo could not be opened'));x.src=u});
      const s=Math.min(1,1500/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      const b=await new Promise((res,rej)=>c.toBlob(x=>x?res(x):rej(Error('Photo conversion failed')),'image/jpeg',.72));
      return pdf.embedJpg(await b.arrayBuffer());
    }finally{URL.revokeObjectURL(u)}
  }

  async function build(){
    const items=Object.entries(records).map(([n])=>({n:+n,r:rec(+n)})).sort((a,b)=>a.n-b.n);if(!items.length)throw Error('No saved project information to send');
    const {PDFDocument,StandardFonts,rgb}=PDFLib,pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),project=activeProject();let p=pdf.addPage([612,792]),y=744,totalReferenced=0,totalEmbedded=0,missing=[];
    const put=(text,size=10,strong=false)=>{for(const line of pdfLines(text,strong?68:82)){if(y<54){p=pdf.addPage([612,792]);y=744}p.drawText(pdfText(line),{x:42,y,size,font:strong?bold:font,color:rgb(.04,.12,.2)});y-=size+5}};
    put('FieldVerify Pro - Office Report',20,true);put(project?.name||'Project',15,true);put(`Created: ${new Date().toLocaleString()}`);put(`Inspection items: ${items.length}`);
    for(let i=0;i<items.length;i++){
      const {n,r}=items[i];toast(`Building Dropbox report: ${i+1} of ${items.length}…`);if(i){p=pdf.addPage([612,792]);y=744}
      put(`${itemName(n,r)} - ${r.status||'No information'}`,16,true);put(`Type: ${itemType(r)}`);put(`GPS: ${num(r.lat)!=null&&num(r.lon)!=null?`${r.lat}, ${r.lon}`:'Not saved'}`);put(`Started: ${r.pickupTime?new Date(r.pickupTime).toLocaleString():'-'}`);put(`Completed: ${r.unloadTime?new Date(r.unloadTime).toLocaleString():'-'}`);put(`NCR: ${ncrStateLabel(n)}`);const ins=r.inspection||{};put(`Inspection overall: ${ins.overall||'Not set'}`);for(const [k,l] of inspectionFields(r))if(ins[k])put(`${l}: ${ins[k]}`);put('Notes',12,true);put(r.notes||'No field notes');
      for(const {row,id} of ncrsForCaisson(n)){put(`${id}: ${statusText(row)}`,11,true);put(`Issue: ${findField(row,['Description','NCR Description','Issue Description','Issue'])||'Not listed'}`);put(`Correction: ${findField(row,['Corrective Description','Corrective Action','Correction Required','SUG Work','Work Required'])||'Not listed'}`)}
      const refs=[...new Set((Array.isArray(r.photos)?r.photos:[]).map(String))],photos=await reportPhotos(n,r);totalReferenced+=refs.length;put(`Photos: ${photos.length}${refs.length!==photos.length?` (${refs.length-photos.length} missing from this device)`:''}`,11,true);
      if(refs.length!==photos.length)missing.push(`${itemName(n,r)}: ${refs.length-photos.length}`);
      for(const ph of photos){
        try{const e=await image(ph.blob,pdf),d=e.scale(Math.min(520/e.width,620/e.height,1)),q=pdf.addPage([612,792]);q.drawText(pdfText(`${itemName(n,r)} - ${ph.name||'Photo'}${ph.date?` - ${new Date(ph.date).toLocaleString()}`:''}`),{x:42,y:748,size:10,font:bold});q.drawImage(e,{x:(612-d.width)/2,y:92+(620-d.height)/2,width:d.width,height:d.height});totalEmbedded++}
        catch(err){missing.push(`${itemName(n,r)}: ${ph.name||ph.id||'photo'} could not be embedded`);console.error('Office report photo failed',ph?.id,err)}
      }
    }
    if(totalReferenced>0&&totalEmbedded===0)throw Error(`This project references ${totalReferenced} photos, but none of the actual photo files are available on this device. Restore a photo-safe backup before sending the office PDF.`);
    if(missing.length)console.warn('Office PDF missing photos:',missing);
    const bytes=await pdf.save(),name=`FieldVerify-Pro-${safe(project?.name)}-Office-Report-${new Date().toISOString().slice(0,10)}.pdf`;
    const file=new File([bytes],name,{type:'application/pdf'});file._fieldVerifyPhotoStats={referenced:totalReferenced,embedded:totalEmbedded,missing:missing.length};return file;
  }

  async function sendLink(url){const text=`FieldVerify Pro office report${activeProject()?.name?` - ${activeProject().name}`:''}\n${url}`;if(navigator.share){try{await navigator.share({title:'FieldVerify Pro Office Report',text});toast('Dropbox report link shared');return}catch(e){if(e?.name==='AbortError'){toast('Sharing canceled');return}}}try{await navigator.clipboard.writeText(text);toast('Dropbox report link copied')}catch{prompt('Copy this Dropbox report link:',url)}}
  const fallback=typeof shareOfficeReport==='function'?shareOfficeReport:null;
  shareOfficeReport=async function(){const auth=window.FIELDVERIFY_DROPBOX_AUTH,io=window.FIELDVERIFY_DROPBOX_IO;if(!auth?.token()){localStorage.setItem('fieldverifyDropboxResumeOffice','yes');await auth?.connect();return}try{const file=await build(),project=safe(activeProject()?.name),day=new Date().toISOString().slice(0,10),path=`/FieldVerify Reports/${project}/${day}/${file.name}`;await io.upload(file,path);const url=await io.link(path),stats=file._fieldVerifyPhotoStats||{};window.FIELDVERIFY_DROPBOX_REPORT.pending={url,file,path};$('shareReadyText').textContent=`Dropbox upload complete: ${(file.size/1048576).toFixed(1)} MB · ${stats.embedded||0} photos included${stats.missing?` · ${stats.missing} missing`:''}. Tap Share Link Now to text or email one Dropbox link.`;$('shareNowBtn').textContent='SHARE LINK NOW';$('shareReady').classList.remove('hidden');toast(`Dropbox report ready - ${stats.embedded||0} photos included`)}catch(e){if(e.message==='DROPBOX_RECONNECT'){localStorage.setItem('fieldverifyDropboxResumeOffice','yes');await window.FIELDVERIFY_DROPBOX_AUTH.connect();return}console.error(e);toast(`Office PDF stopped: ${e.message}`);alert(`Office PDF was NOT sent.\n\n${e.message}`)}};
  const btn=$('shareNowBtn');if(btn)btn.onclick=async()=>{const x=window.FIELDVERIFY_DROPBOX_REPORT.pending;if(!x){if(typeof sharePendingOfficeFile==='function')return sharePendingOfficeFile();return}await sendLink(x.url);window.FIELDVERIFY_DROPBOX_REPORT.pending=null;$('shareReady').classList.add('hidden');btn.textContent='SHARE PDF NOW'};
  window.FIELDVERIFY_DROPBOX_REPORT={version:VERSION,pending:null,build};try{bindTools()}catch{}
  window.FIELDVERIFY_DROPBOX_AUTH?.finish().then(ok=>{if(ok){toast('Dropbox connected');if(localStorage.getItem('fieldverifyDropboxResumeOffice')==='yes'){localStorage.removeItem('fieldverifyDropboxResumeOffice');setTimeout(()=>shareOfficeReport(),400)}}}).catch(e=>toast(`Dropbox connection failed: ${e.message}`));
})();