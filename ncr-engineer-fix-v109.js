(()=>{
  const BUILD_VERSION='10.9';
  const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const html=s=>String(s??'').replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':'&quot;'}[m]));

  function get(row,names){
    if(!row||typeof row!=='object')return '';
    const entries=Object.entries(row);
    for(const wanted of names){
      const hit=entries.find(([k])=>norm(k)===norm(wanted));
      if(hit&&clean(hit[1]))return clean(hit[1]);
    }
    return '';
  }

  function engineerFix(row){
    return get(row,[
      'Resolution / Engineer Direction','Engineer Direction','Engineer Suggested Correction',
      'Engineers Suggested Correction',"Engineer's Suggested Correction",'Engineer Suggested Fix',
      "Engineer's Suggested Fix",'Suggested Correction','Suggested Corrective Action','Proposed Correction',
      'Proposed Fix','Recommended Correction','Corrective Description','Corrective Action','Correction Required',
      'SUG Required Work','SUG work','SUG Work','Work Required','Disposition','Resolution','Design Team Response',
      'Engineer Response','RME Response','SOM / RME Response','Description.1','Status'
    ]);
  }

  function install(){
    if(typeof ncrSummaryHtml!=='function'||window.__engineerFix109)return;
    window.__engineerFix109=true;
    const previous=ncrSummaryHtml;
    ncrSummaryHtml=function(n){
      let base=previous(n);
      const list=typeof ncrsForCaisson==='function'?ncrsForCaisson(n):[];
      if(!list.length)return base;
      const cards=list.map(({row,id})=>{
        const fix=engineerFix(row);
        return `<div class="ncr-engineer-v109" style="margin:10px 0;border:2px solid #2563eb;border-radius:12px;background:#eff6ff;padding:12px">
          <div style="font-size:14px;font-weight:900;color:#1d4ed8;margin-bottom:6px">ENGINEER'S SUGGESTED FIX</div>
          <div style="font-size:16px;line-height:1.4;font-weight:750;white-space:pre-wrap;color:#0f172a">${fix?html(fix):'<span style="color:#64748b;font-weight:650">No engineer suggested fix is listed in the imported Excel row.</span>'}</div>
        </div>`;
      }).join('');
      const marker='<div class="ncr-manual">';
      const at=base.lastIndexOf(marker);
      return at>=0?base.slice(0,at)+cards+base.slice(at):base+cards;
    };
    const title=document.querySelector('.top .title');
    if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD_VERSION}`;
    localStorage.setItem('fieldVerifyInstalledBuild',BUILD_VERSION);
    if(typeof showTarget==='function')showTarget();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,40));
  else setTimeout(install,40);
})();
