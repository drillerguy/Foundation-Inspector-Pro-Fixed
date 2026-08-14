(()=>{
  const BUILD_VERSION='10.8';
  const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':'&quot;'}[m]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

  const exactPriority=[
    'sug required work','sug work','resolution engineer direction','engineer direction',
    'engineers suggested fix','engineer suggested fix','proposed fix','proposed corrective action',
    'corrective action','correction required','recommended correction','recommended fix',
    'remedial work','resolution','description 1'
  ];
  const rejectShort=/^(picked up|open|closed|pending|accepted|complete|completed|resolved|yes|no|n\/a|na|none|update\??)$/i;

  function engineerFix(row){
    if(!row||typeof row!=='object') return '';
    const entries=Object.entries(row).map(([k,v])=>({key:k,nk:norm(k),value:clean(v)})).filter(x=>x.value);

    for(const wanted of exactPriority){
      const hit=entries.find(x=>x.nk===wanted);
      if(hit && !(hit.value.length<30 && rejectShort.test(hit.value))) return hit.value;
    }

    const fuzzy=entries.filter(x=>
      /engineer|corrective|correction|proposed fix|recommended fix|remedial|required work/.test(x.nk) ||
      (x.nk.includes('sug') && x.nk.includes('work')) ||
      (x.nk.includes('resolution') && !x.nk.includes('status'))
    );
    for(const hit of fuzzy){
      if(!(hit.value.length<30 && rejectShort.test(hit.value))) return hit.value;
    }
    return '';
  }

  function excelNcrLabel(row,fallback){
    const keys=['NCR / ACC Reference','NCR # as written on NCR followed by ACC number','NCR Number','NCR #','NCR','ACC Number','ACC #','ACC ID'];
    for(const k of keys){
      const found=Object.entries(row||{}).find(([rk])=>norm(rk)===norm(k));
      if(found && clean(found[1])) return clean(found[1]);
    }
    return fallback||'NCR';
  }

  function fixCard(row,id){
    const fix=engineerFix(row);
    const label=excelNcrLabel(row,id);
    return `<div class="engineer-fix-v108" style="margin:10px 0 12px;border:2px solid #2563eb;border-radius:12px;background:#eff6ff;padding:12px">
      <div style="font-size:13px;font-weight:900;letter-spacing:.03em;color:#1d4ed8;margin-bottom:5px">ENGINEER'S SUGGESTED FIX</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:6px">From imported Excel — ${esc(label)}</div>
      <div style="font-size:16px;line-height:1.4;font-weight:750;white-space:pre-wrap;color:#0f172a">${fix?esc(fix):'<span style="font-weight:600;color:#64748b">No engineer suggested fix is listed in the matched Excel row.</span>'}</div>
    </div>`;
  }

  function installDisplay(){
    if(typeof ncrSummaryHtml!=='function' || window.__engineerFix108) return;
    window.__engineerFix108=true;
    const original=ncrSummaryHtml;
    ncrSummaryHtml=function(n){
      let base=original(n);
      const list=typeof ncrsForCaisson==='function'?ncrsForCaisson(n):[];
      if(!list.length) return base;
      const cards=list.map(({row,id})=>fixCard(row,id)).join('');
      const marker='<div class="ncr-manual">';
      const idx=base.lastIndexOf(marker);
      return idx>=0 ? base.slice(0,idx)+cards+base.slice(idx) : base+cards;
    };
  }

  function updateVersion(){
    const title=document.querySelector('.top .title');
    if(title) title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD_VERSION}`;
    localStorage.setItem('fieldVerifyInstalledBuild',BUILD_VERSION);
  }

  function install(){
    installDisplay();
    updateVersion();
    if(typeof showTarget==='function') showTarget();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,20));
  else setTimeout(install,20);
})();
