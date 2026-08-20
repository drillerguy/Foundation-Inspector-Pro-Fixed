/* FieldVerify Pro office report splitter v10.3.2
   Builds Send PDF to Office reports and automatically splits oversized reports
   into email/text-friendly numbered PDF parts.

   iPhone/iPad note: share one generated PDF File at a time and share the file
   itself without a separate text payload. This is more reliable with Apple Mail
   and prevents Mail from opening a draft without the PDF attachment.
*/
(() => {
  'use strict';
  const OFFICE_SPLIT_VERSION = '10.3.2';
  const TARGET_BYTES = 12 * 1024 * 1024;
  const HARD_BYTES = 15 * 1024 * 1024;
  let pendingOfficeFiles = [];

  function safeName(value){return String(value||'Project').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'Project'}

  async function officeImageForPdf(blob,pdf,quality=.68,maxDimension=1300){
    const url=URL.createObjectURL(blob);
    try{
      const img=await new Promise((res,rej)=>{const x=new Image();x.onload=()=>res(x);x.onerror=()=>rej(Error('Photo could not be opened'));x.src=url});
      const scale=Math.min(1,maxDimension/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const jpeg=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Photo conversion failed')),'image/jpeg',quality));
      return pdf.embedJpg(await jpeg.arrayBuffer());
    }finally{URL.revokeObjectURL(url)}
  }

  async function buildOfficePart(items,partNumber,totalParts,compact=false){
    const {PDFDocument,StandardFonts,rgb}=PDFLib;
    const pdf=await PDFDocument.create();
    const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    const project=activeProject();
    let page=pdf.addPage([612,792]),y=744;
    const put=(text,size=10,strong=false)=>{
      for(const line of pdfLines(text,strong?68:82)){
        if(y<54){page=pdf.addPage([612,792]);y=744}
        page.drawText(pdfText(line),{x:42,y,size,font:strong?bold:font,color:rgb(.04,.12,.2)});y-=size+5;
      }
    };
    put('FieldVerify Pro - Office Report',20,true);
    put(project?.name||'Project',15,true);
    put(`Created: ${new Date().toLocaleString()}`);
    put(`Part ${partNumber} of ${totalParts}`,12,true);
    put(`Inspection items in this part: ${items.length}`);

    for(let i=0;i<items.length;i++){
      const {n,r}=items[i];
      if(i>0){page=pdf.addPage([612,792]);y=744}
      put(`${itemName(n,r)} - ${r.status||'No information'}`,16,true);
      put(`Type: ${itemType(r)}`);
      put(`GPS: ${num(r.lat)!=null&&num(r.lon)!=null?`${r.lat}, ${r.lon}`:'Not saved'}`);
      put(`Started: ${r.pickupTime?new Date(r.pickupTime).toLocaleString():'-'}`);
      put(`Completed: ${r.unloadTime?new Date(r.unloadTime).toLocaleString():'-'}`);
      put(`NCR: ${ncrStateLabel(n)}`);
      const inspection=r.inspection||{};
      put(`Inspection overall: ${inspection.overall||'Not set'}`);
      for(const [key,label] of inspectionFields(r)) if(inspection[key]) put(`${label}: ${inspection[key]}`);
      put('Notes',12,true);put(r.notes||'No field notes');
      const itemNcrs=ncrsForCaisson(n);
      if(itemNcrs.length) put('NCR Information',12,true);
      for(const {row,id} of itemNcrs){
        const issue=findField(row,['Description','NCR Description','Issue Description','Issue'])||'Not listed';
        const correction=findField(row,['Proposed Fix','Proposed Corrective Action','Proposed Correction','Proposed Repair','Description.1','Resolution / Engineer Direction','Corrective Description','Corrective Action','Correction Required','SUG Work','Work Required'])||'Not listed';
        const rfi=findField(row,['RFI Status','RFI','RFI Number'])||'Not listed';
        const ball=findField(row,['Ball in Court','Responsible Party','Owner'])||'Not listed';
        const sug=findField(row,['SUG work','SUG Required Work','SUG Work','Work Required'])||'Not listed';
        put(`NCR #: ${id}`,11,true);
        put(`Status: ${statusText(row)}`);
        put(`Issue: ${issue}`);
        put(`Proposed Fix / Corrective Action: ${correction}`);
        put(`RFI Status: ${rfi}`);
        put(`Ball in Court: ${ball}`);
        put(`SUG Required Work: ${sug}`);
      }
      const photos=await getPhotos(n);put(`Photos: ${photos.length}`,11,true);
      for(const photo of photos){
        try{
          const embedded=await officeImageForPdf(photo.blob,pdf,compact?.50:.68,compact?950:1300);
          const dims=embedded.scale(Math.min(520/embedded.width,620/embedded.height,1));
          const photoPage=pdf.addPage([612,792]);
          photoPage.drawText(pdfText(`${itemName(n,r)} - ${photo.name||'Photo'}${photo.date?` - ${new Date(photo.date).toLocaleString()}`:''}`),{x:42,y:748,size:10,font:bold});
          photoPage.drawImage(embedded,{x:(612-dims.width)/2,y:92+(620-dims.height)/2,width:dims.width,height:dims.height});
        }catch(err){console.warn('Office report photo skipped',err)}
      }
    }
    const bytes=await pdf.save();
    const suffix=totalParts>1?`-Part-${partNumber}-of-${totalParts}`:'';
    return new File([bytes],`FieldVerify-Pro-${safeName(project?.name)}-Office-Report${suffix}-${new Date().toISOString().slice(0,10)}.pdf`,{type:'application/pdf',lastModified:Date.now()});
  }

  async function itemWeight(item){
    try{return (await getPhotos(item.n)).reduce((sum,p)=>sum+(p?.blob?.size||0),100000)}catch{return 100000}
  }

  async function initialGroups(items){
    const groups=[];let group=[],weight=0;
    for(const item of items){
      const w=await itemWeight(item);
      if(group.length&&weight+w>TARGET_BYTES){groups.push(group);group=[];weight=0}
      group.push(item);weight+=w;
    }
    if(group.length)groups.push(group);
    return groups.length?groups:[items];
  }

  async function buildSizedFiles(items){
    let groups=await initialGroups(items),changed=true;
    while(changed){
      changed=false;const next=[];
      for(let i=0;i<groups.length;i++){
        const g=groups[i];
        toast(`Sizing office PDF ${i+1} of ${groups.length}…`);
        const test=await buildOfficePart(g,i+1,groups.length,false);
        if(test.size>HARD_BYTES&&g.length>1){
          const mid=Math.ceil(g.length/2);next.push(g.slice(0,mid),g.slice(mid));changed=true;
        }else next.push(g);
      }
      groups=next;
    }
    const files=[];
    for(let i=0;i<groups.length;i++){
      toast(`Building office PDF ${i+1} of ${groups.length}…`);
      let file=await buildOfficePart(groups[i],i+1,groups.length,false);
      if(file.size>HARD_BYTES&&groups[i].length===1) file=await buildOfficePart(groups[i],i+1,groups.length,true);
      files.push(file);
    }
    return files;
  }

  function updateShareReady(){
    pendingOfficeFile=pendingOfficeFiles[0]||null;
    if(!pendingOfficeFiles.length){$('shareReady').classList.add('hidden');return}
    const first=pendingOfficeFiles[0];
    const total=pendingOfficeFiles.reduce((s,f)=>s+f.size,0);
    if(pendingOfficeFiles.length===1){
      $('shareReadyText').textContent=`${first.name} is ${(first.size/1048576).toFixed(1)} MB. Tap Share PDF Now, then choose Mail. The PDF contains the report information and saved photos.`;
    }else{
      $('shareReadyText').textContent=`${pendingOfficeFiles.length} PDF parts remain (${(total/1048576).toFixed(1)} MB total). Share one part at a time so iPhone Mail keeps the PDF attached. Current: ${first.name}`;
    }
  }

  shareOfficeReport=async function splitOfficeReport(){
    const items=Object.entries(records).map(([n])=>({n:+n,r:rec(+n)})).sort((a,b)=>a.n-b.n);
    if(!items.length){toast('No saved project information to send');return}
    try{
      toast('Preparing office report and photos…');
      pendingOfficeFiles=await buildSizedFiles(items);
      updateShareReady();
      $('shareReady').classList.remove('hidden');
      toast(pendingOfficeFiles.length===1?'Office PDF ready':`Office report split into ${pendingOfficeFiles.length} email-safe parts`);
    }catch(err){toast(`Office report failed: ${err.message}`)}
  };

  sharePendingOfficeFile=async function shareSplitOfficeFiles(){
    const file=pendingOfficeFiles[0]||pendingOfficeFile;
    if(!file){toast('Build the office report first');$('shareReady').classList.add('hidden');return}

    // Share exactly one real PDF File and no separate text/url payload. On iOS,
    // this is the most reliable route to Mail retaining the generated PDF.
    const payload={files:[file]};
    if(navigator.share&&(!navigator.canShare||navigator.canShare(payload))){
      try{
        await navigator.share(payload);
        if(pendingOfficeFiles.length) pendingOfficeFiles.shift();
        else pendingOfficeFile=null;
        if(pendingOfficeFiles.length){
          updateShareReady();
          $('shareReady').classList.remove('hidden');
          toast(`${pendingOfficeFiles.length} PDF part${pendingOfficeFiles.length===1?'':'s'} still to share`);
        }else{
          pendingOfficeFile=null;
          $('shareReady').classList.add('hidden');
          toast('Project report shared');
        }
        return;
      }catch(err){
        if(err?.name==='AbortError'){toast('Sharing canceled');return}
        console.warn('PDF share failed',err);
        toast('Mail attachment share failed - saving PDF instead');
      }
    }

    downloadFile(file);
    if(pendingOfficeFiles.length) pendingOfficeFiles.shift();
    else pendingOfficeFile=null;
    if(pendingOfficeFiles.length){updateShareReady();$('shareReady').classList.remove('hidden')}
    else $('shareReady').classList.add('hidden');
    toast('PDF saved to Downloads so it can be attached manually');
  };

  const shareBtn=document.getElementById('shareNowBtn');if(shareBtn)shareBtn.onclick=sharePendingOfficeFile;
  try{bindTools()}catch{}
  window.FIELDVERIFY_OFFICE_SPLIT={version:OFFICE_SPLIT_VERSION,targetMB:12,hardMB:15,ncrDetails:true,iosSingleFileShare:true};
  console.info(`FieldVerify office splitter v${OFFICE_SPLIT_VERSION} loaded · iOS Mail attachment fix`);
})();
