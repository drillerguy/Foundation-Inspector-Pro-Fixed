(()=>{
  const BUILD_VERSION='10.6';
  const KEY='fieldVerifyNcrMarkersVisible';
  const SESSION_KEY='fieldVerifyLastSessionV106';
  const BUILD_KEY='fieldVerifyInstalledBuild';
  let visible=localStorage.getItem(KEY)!=='false';

  function updateVersionHeader(){
    const title=document.querySelector('.top .title');
    if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD_VERSION}`;
    document.documentElement.setAttribute('data-fieldverify-version',BUILD_VERSION);
    localStorage.setItem(BUILD_KEY,BUILD_VERSION);
  }

  function addStyles(){
    if(document.getElementById('ncrUiPatchStyle'))return;
    const style=document.createElement('style');
    style.id='ncrUiPatchStyle';
    style.textContent=`
      #ncrRfiToggle{font-size:10px;line-height:1.05;min-width:54px}
      .ncr-reason-notes{background:#fff0f0;border:1px solid #d89b9b;border-radius:10px;padding:9px;margin:0 0 9px;font-size:12px;line-height:1.35}
      .ncr-reason-notes b{color:#8d1b1b}
      .ncr-excel-detail{border:2px solid #d49300;background:#fff8df;border-radius:12px;padding:11px;margin:8px 0;line-height:1.35}
      .ncr-excel-detail.closed{border-color:#16803d;background:#eaf8ee}
      .ncr-excel-title{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:16px;font-weight:900}
      .ncr-excel-status{font-size:11px;border-radius:999px;padding:3px 8px;background:#ffe4a3;white-space:nowrap}
      .ncr-excel-detail.closed .ncr-excel-status{background:#ccebd5;color:#12642f}
      .ncr-excel-reason{font-size:15px;font-weight:800;margin-top:5px;white-space:pre-wrap}
      .ncr-excel-value{white-space:pre-wrap}
      .ncr-engineer-box{background:#eef5ff;border:1px solid #8eb6df;border-radius:10px;padding:9px;margin-top:9px}
      .ncr-engineer-box .label{margin-top:0;color:#214f7b;font-weight:900}
      .ncr-engineer-box .ncr-excel-value{font-size:15px;font-weight:800;color:#173d61}
    `;
    document.head.appendChild(style);
  }

  const originalStateClass=stateClass;
  stateClass=function(r,n){
    let cls=originalStateClass(r,n);
    if(!visible)cls=cls.replace(/\s+ncr-(open|pending|cleared)/g,'');
    return cls;
  };

  function updateToggle(){
    const b=document.getElementById('ncrRfiToggle');
    if(!b)return;
    b.textContent=visible?'NCR/RFI ON':'NCR/RFI OFF';
    b.style.background=visible?'#b42318':'#687480';
  }

  function installToggle(){
    const controls=document.querySelector('.map-controls');
    if(!controls||document.getElementById('ncrRfiToggle'))return;
    const b=document.createElement('button');
    b.id='ncrRfiToggle';
    b.className='map-reset';
    b.setAttribute('aria-label','Toggle NCR and RFI map colors');
    b.onclick=()=>{
      visible=!visible;
      localStorage.setItem(KEY,String(visible));
      updateToggle();
      renderPins();
      toast(visible?'NCR / RFI map colors shown':'NCR / RFI map colors hidden');
      saveSession();
    };
    const zoomOut=document.getElementById('zoomOut');
    controls.insertBefore(b,zoomOut||null);
    updateToggle();
  }

  function field(row,names){
    return String(findField(row,names)||'').trim();
  }

  function reasonRows(n){
    return ncrsForCaisson(n).map(({row,id})=>{
      const issue=field(row,['Description','NCR Description','Issue Description','Issue','Reason','NCR Reason']);
      return issue?{id,issue}:null;
    }).filter(Boolean);
  }

  const originalNcrSummaryHtml=ncrSummaryHtml;
  ncrSummaryHtml=function(n){
    if(!ncrRows.length)return originalNcrSummaryHtml(n);
    const list=ncrsForCaisson(n);
    const manual=rec(n).ncrManualStatus||'';
    const selector=`<div class="ncr-manual">
      <label class="label">NCR STATUS FOR THIS ITEM</label>
      <select class="field" onchange="updateManualNcrStatus(${n},this.value)">
        <option value="" ${manual===''?'selected':''}>Use imported spreadsheet status</option>
        <option value="open" ${manual==='open'?'selected':''}>Open</option>
        <option value="pending" ${manual==='pending'?'selected':''}>Pending review / RFI</option>
        <option value="corrected-waiting" ${manual==='corrected-waiting'?'selected':''}>Corrected — waiting for acceptance</option>
        <option value="cleared" ${manual==='cleared'?'selected':''}>Cleared</option>
      </select>
      <div class="tiny" style="margin-top:5px">Current map color: <b>${ncrStateLabel(n)}</b></div>
    </div>`;

    if(!list.length)return `<div class="card"><h2 style="font-size:17px">NCR Information</h2><div class="tiny">No imported NCR lists ${esc(itemName(n,rec(n)))}.</div>${selector}</div>`;

    return `<div class="card"><h2 style="font-size:17px">NCR Information — ${list.length} Found</h2>
      <div class="tiny" style="margin-bottom:8px">Information below is read directly from the imported NCR Excel file.</div>
      ${list.map(({row,id})=>{
        const issue=field(row,['Description','NCR Description','Issue Description','Issue','Reason','NCR Reason']);
        const shafts=field(row,['Shafts Affected','Caissons Affected','Caisson','Shaft Number','Affected Shafts']);
        const direction=field(row,['Resolution / Engineer Direction','Engineer Direction','Engineer Suggested Correction','Engineers Suggested Correction',"Engineer's Suggested Correction",'Suggested Correction','Suggested Corrective Action','Proposed Correction','Proposed Fix','Recommended Correction','Corrective Description','Corrective Action','Correction Required','Work Required','Disposition','Resolution','Design Team Response','Engineer Response','RME Response','SOM / RME Response','Description.1']);
        const rfi=field(row,['RFI Status','RFI','RFI Number','RFI #']);
        const ncrStatus=field(row,['NCR Status']);
        const update=field(row,['Status 07/31/26','Current Update (07/31/26)','Current Update','Update','Latest Update']);
        const ball=field(row,['Ball in Court','Responsible Party','Owner','Responsibility']);
        const sug=field(row,['SUG work','SUG Work','SUG Required Work','SUG Required Correction','Contractor Required Work']);
        const notes=field(row,['Notes','Comments','Remarks','NCR Notes','Engineer Notes']);
        const acc=field(row,['ACC ID','ID #','ACC Number','ACC #']);
        const ref=field(row,['NCR / ACC Reference','NCR # as written on NCR followed by ACC number','NCR Reference','NCR Number']);
        const status=statusText(row);
        return `<div class="ncr-excel-detail ${isClosedNcr(row)?'closed':''}">
          <div class="ncr-excel-title"><span>NCR ${esc(id)}</span><span class="ncr-excel-status">${esc(status)}</span></div>
          ${acc?`<div class="label">ACC ID</div><div class="ncr-excel-value">${esc(acc)}</div>`:''}
          ${ref && String(ref)!==String(id)?`<div class="label">NCR / ACC REFERENCE</div><div class="ncr-excel-value">${esc(ref)}</div>`:''}
          ${issue?`<div class="label">WHY THIS NCR WAS ISSUED</div><div class="ncr-excel-reason">${esc(issue)}</div>`:''}
          ${shafts?`<div class="label">SHAFTS AFFECTED</div><div class="ncr-excel-value">${esc(shafts)}</div>`:''}
          ${direction?`<div class="ncr-engineer-box"><div class="label">ENGINEER SUGGESTED CORRECTION / RESOLUTION</div><div class="ncr-excel-value">${esc(direction)}</div></div>`:''}
          ${sug?`<div class="label">SUG REQUIRED WORK / PROPOSED FIX</div><div class="ncr-excel-value">${esc(sug)}</div>`:''}
          ${rfi?`<div class="label">RFI STATUS</div><div class="ncr-excel-value">${esc(rfi)}</div>`:''}
          ${ncrStatus?`<div class="label">NCR STATUS</div><div class="ncr-excel-value">${esc(ncrStatus)}</div>`:''}
          ${update?`<div class="label">CURRENT UPDATE</div><div class="ncr-excel-value">${esc(update)}</div>`:''}
          ${ball?`<div class="label">BALL IN COURT / RESPONSIBLE PARTY</div><div class="ncr-excel-value">${esc(ball)}</div>`:''}
          ${notes?`<div class="label">NOTES / COMMENTS</div><div class="ncr-excel-value">${esc(notes)}</div>`:''}
        </div>`;
      }).join('')}
      ${selector}
    </div>`;
  };

  function addReasonToNotes(){
    const notes=document.getElementById('notes');
    if(!notes||document.querySelector('.ncr-reason-notes'))return;
    const n=selected??nearest;
    if(n==null)return;
    const rows=reasonRows(n);
    if(!rows.length)return;
    const box=document.createElement('div');
    box.className='ncr-reason-notes';
    const title=document.createElement('b');
    title.textContent='NCR Reason from Imported Excel';
    box.appendChild(title);
    rows.forEach(({id,issue})=>{
      const line=document.createElement('div');
      line.style.marginTop='6px';
      const strong=document.createElement('strong');
      strong.textContent=`NCR ${id}: `;
      line.appendChild(strong);
      line.appendChild(document.createTextNode(issue));
      box.appendChild(line);
    });
    notes.parentNode.insertBefore(box,notes);
  }

  const originalShowTarget=showTarget;
  showTarget=function(...args){
    const result=originalShowTarget.apply(this,args);
    addReasonToNotes();
    return result;
  };

  function saveSession(){
    try{
      if(typeof persist==='function')persist();
      if(typeof persistNcr==='function')persistNcr();

      const shell=document.getElementById('mapShell');
      const notes=document.getElementById('notes');
      const filter=document.getElementById('itemFilter');
      const snapshot={
        version:BUILD_VERSION,
        savedAt:new Date().toISOString(),
        activeProjectId:typeof activeProjectId!=='undefined'?activeProjectId:null,
        selected:typeof selected!=='undefined'?selected:null,
        nearest:typeof nearest!=='undefined'?nearest:null,
        filter:filter?filter.value:'',
        notesDraft:notes?notes.value:null,
        mapWidth:typeof mapWidth!=='undefined'?mapWidth:null,
        scrollLeft:shell?shell.scrollLeft:0,
        scrollTop:shell?shell.scrollTop:0,
        ncrVisible:visible
      };
      localStorage.setItem(SESSION_KEY,JSON.stringify(snapshot));
    }catch(err){
      console.warn('FieldVerify autosave failed',err);
    }
  }

  function restoreSession(){
    try{
      const raw=localStorage.getItem(SESSION_KEY);
      if(!raw)return;
      const s=JSON.parse(raw);

      if(s.activeProjectId && typeof projects!=='undefined' && projects.some(p=>p.id===s.activeProjectId) && s.activeProjectId!==activeProjectId){
        activeProjectId=s.activeProjectId;
        if(typeof saveProjects==='function')saveProjects();
        if(typeof loadRecords==='function')loadRecords();
      }

      const filter=document.getElementById('itemFilter');
      if(filter && typeof s.filter==='string')filter.value=s.filter;

      if(s.selected!=null)selected=s.selected;
      if(s.nearest!=null)nearest=s.nearest;
      if(typeof s.ncrVisible==='boolean'){
        visible=s.ncrVisible;
        localStorage.setItem(KEY,String(visible));
      }

      if(Number.isFinite(Number(s.mapWidth)) && typeof setMapWidth==='function'){
        setTimeout(()=>setMapWidth(Number(s.mapWidth)),100);
      }

      setTimeout(()=>{
        if(typeof renderPins==='function')renderPins();
        if(typeof showTarget==='function')showTarget();
        installToggle();
        updateToggle();

        const notes=document.getElementById('notes');
        if(notes && s.notesDraft!=null && !notes.value)notes.value=s.notesDraft;

        const shell=document.getElementById('mapShell');
        if(shell) shell.scrollTo({left:Number(s.scrollLeft)||0,top:Number(s.scrollTop)||0,behavior:'auto'});
      },180);
    }catch(err){
      console.warn('FieldVerify session restore failed',err);
    }
  }

  function installAutosave(){
    setInterval(saveSession,30000);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)saveSession();
    });
    window.addEventListener('pagehide',saveSession);
    window.addEventListener('beforeunload',saveSession);
    window.addEventListener('freeze',saveSession);
  }

  updateVersionHeader();
  addStyles();
  installToggle();
  addReasonToNotes();
  restoreSession();
  installAutosave();
  renderPins();
})();
