(()=>{
  const BUILD_VERSION='10.8';
  const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function sheetScore(rows,name){
    if(!rows.length)return -1;
    const keys=new Set();
    for(const row of rows.slice(0,12)) Object.keys(row||{}).forEach(k=>keys.add(norm(k)));
    const wanted=[
      'shafts affected','caissons affected','shaft number','affected shafts',
      'description','issue','description 1','resolution engineer direction','engineer direction',
      'sug work','sug required work','proposed fix','corrective action','correction required',
      'ncr status','rfi status','ball in court','current update','status'
    ];
    let score=0;
    for(const w of wanted){ if([...keys].some(k=>k===w || k.includes(w) || w.includes(k))) score+=10; }
    if(/clean.*ncr|ncr.*register|update/i.test(name)) score+=25;
    score+=Math.min(rows.length,100)/100;
    return score;
  }

  function installImporter(){
    const input=document.getElementById('ncrExcelInput');
    if(!input || input.dataset.v108==='yes')return;
    input.dataset.v108='yes';
    input.onchange=async e=>{
      const file=e.target.files[0]; if(!file)return;
      try{
        toast('Reading NCR spreadsheet…');
        const XLSX=await loadXlsxLibrary();
        const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
        let best=[],bestName='',bestScore=-1;
        for(const name of wb.SheetNames){
          const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:'',raw:false});
          const score=sheetScore(rows,name);
          if(score>bestScore){bestScore=score;best=rows;bestName=name;}
        }
        if(!best.length)throw Error('No NCR rows were found');
        ncrRows=best;
        persistNcr();
        renderPins();
        showTarget();
        toast(`${ncrRows.length} NCR rows imported from ${bestName}`);
      }catch(err){ toast(`NCR import failed: ${err.message}`); }
      e.target.value='';
    };
  }

  function updateVersion(){
    const title=document.querySelector('.top .title');
    if(title) title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD_VERSION}`;
    localStorage.setItem('fieldVerifyInstalledBuild',BUILD_VERSION);
  }

  function install(){ installImporter(); updateVersion(); if(typeof showTarget==='function')showTarget(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();
