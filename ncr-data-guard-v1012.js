(()=>{
  const BUILD_VERSION='10.19';
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,' ');

  function value(row,names){
    if(!row||typeof row!=='object')return '';
    const entries=Object.entries(row);
    for(const wanted of names){
      const hit=entries.find(([k])=>norm(k)===norm(wanted));
      if(hit&&clean(hit[1]))return hit[1];
    }
    return '';
  }

  function hasKey(row,names){
    if(!row||typeof row!=='object')return false;
    const keys=Object.keys(row).map(norm);
    return names.some(name=>keys.includes(norm(name)));
  }

  const ID_HEADERS=[
    'NCR / ACC Reference','NCR # as written on NCR followed by ACC number','NCR Reference',
    'NCR Number','NCR #','NCR','ACC ID','ID #','ACC Number','ACC #'
  ];
  const SHAFT_HEADERS=['Shafts Affected','Caissons Affected','Affected Shafts'];
  const NCR_CONTENT_HEADERS=[
    'Issue','Description','NCR Description','Issue Description','Resolution / Engineer Direction',
    'Description.1','RFI Status','NCR Status','Current Update (07/31/26)','Status 07/31/26',
    'Ball in Court','SUG Required Work','SUG work','SUG Work'
  ];

  function looksLikeNcrRow(row){
    return hasKey(row,ID_HEADERS) && hasKey(row,SHAFT_HEADERS) && hasKey(row,NCR_CONTENT_HEADERS);
  }

  try{
    if(typeof ncrRows!=='undefined' && Array.isArray(ncrRows) && ncrRows.length){
      const sample=ncrRows.slice(0,Math.min(12,ncrRows.length));
      const good=sample.filter(looksLikeNcrRow).length;
      if(good===0){
        console.warn('FieldVerify: invalid NCR dataset detected; clearing it so the built-in NCR register can reload');
        ncrRows=[];
        if(typeof persistNcr==='function')persistNcr();
      }
    }
  }catch(err){console.warn('NCR data guard failed',err)}

  if(typeof numbersIn==='function'){
    window.ncrsForCaisson=function(n){
      if(typeof ncrRows==='undefined'||!Array.isArray(ncrRows))return [];
      return ncrRows.map((row,index)=>({row,index,id:window.ncrId(row,index)}))
        .filter(item=>looksLikeNcrRow(item.row))
        .filter(item=>numbersIn(value(item.row,SHAFT_HEADERS)).includes(Number(n)));
    };
  }

  window.ncrId=function(row,index){
    return clean(value(row,ID_HEADERS))||`NCR-${index+1}`;
  };

  const title=document.querySelector('.top .title');
  if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
  document.title=`FieldVerify Pro v${BUILD_VERSION}`;
  document.documentElement.setAttribute('data-fieldverify-version',BUILD_VERSION);
  localStorage.setItem('fieldVerifyInstalledBuild',BUILD_VERSION);
})();
