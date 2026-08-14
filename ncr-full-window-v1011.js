(()=>{
  const BUILD_VERSION='10.11';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':'&quot;'}[m]));
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,' ');
  const PREFERRED_HEADERS=[
    'ACC ID',
    'NCR / ACC Reference',
    'Issue',
    'Shafts Affected',
    'Resolution / Engineer Direction',
    'RFI Status',
    'NCR Status',
    'Current Update (07/31/26)',
    'Ball in Court',
    'SUG Required Work'
  ];

  function valueFor(row,header){
    if(!row||typeof row!=='object')return '';
    const hit=Object.entries(row).find(([k])=>norm(k)===norm(header));
    return hit?hit[1]:'';
  }

  function fullRows(row){
    const rows=[];
    const used=new Set();
    for(const header of PREFERRED_HEADERS){
      const hit=Object.keys(row||{}).find(k=>norm(k)===norm(header));
      if(hit)used.add(hit);
      rows.push([header,valueFor(row,header)]);
    }
    for(const [key,value] of Object.entries(row||{})){
      if(used.has(key))continue;
      const label=clean(key);
      if(!label||/^unnamed:/i.test(label))continue;
      rows.push([label,value]);
    }
    return rows;
  }

  window.openFullNcrExcel=function(n,index=0){
    const list=typeof ncrsForCaisson==='function'?ncrsForCaisson(n):[];
    const item=list[index];
    if(!item){if(typeof toast==='function')toast('No NCR Excel row found for this item');return;}
    const {row,id}=item;
    const rows=fullRows(row);
    const w=window.open('','_blank');
    if(!w){if(typeof toast==='function')toast('Allow pop-ups to open full NCR details');return;}
    const title=`${id||'NCR'} — Full Excel Details`;
    const body=rows.map(([header,value])=>`<div class="line"><div class="hdr">${esc(header)}</div><div class="val">${clean(value)?esc(value):'<span class="blank">—</span>'}</div></div>`).join('');
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
      :root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#15202b;background:#eef2f6}body{margin:0;padding:14px;background:#eef2f6}.wrap{max-width:760px;margin:0 auto}.top{background:#083a73;color:#fff;border-radius:16px;padding:16px;margin-bottom:12px}.top h1{font-size:24px;margin:0 0 5px}.sub{font-size:13px;opacity:.85}.line{background:#fff;border:1px solid #d7dee7;border-radius:12px;padding:11px 12px;margin:8px 0;box-shadow:0 1px 2px #0000000d}.hdr{font-size:12px;font-weight:900;color:#4b5a68;text-transform:uppercase;letter-spacing:.03em;margin-bottom:5px}.val{font-size:17px;font-weight:650;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere}.blank{color:#9aa4ad;font-weight:500}.actions{display:flex;gap:8px;margin:12px 0}.actions button{flex:1;border:0;border-radius:11px;padding:13px;font:900 15px inherit}.back{background:#083a73;color:#fff}.print{background:#16803d;color:#fff}@media print{body{background:#fff;padding:0}.actions{display:none}.line{box-shadow:none;break-inside:avoid}.top{border-radius:0}}
    </style></head><body><div class="wrap"><div class="top"><h1>${esc(title)}</h1><div class="sub">Shaft / item ${esc(n)} · every NCR Excel header shown on its own line</div></div><div class="actions"><button class="back" onclick="window.close()">Back to FieldVerify Pro</button><button class="print" onclick="window.print()">Print / Share</button></div>${body}</div></body></html>`);
    w.document.close();
  };

  function install(){
    if(typeof ncrSummaryHtml!=='function'||window.__fullNcrWindow1011)return;
    window.__fullNcrWindow1011=true;
    const previous=ncrSummaryHtml;
    ncrSummaryHtml=function(n){
      const base=previous(n);
      const list=typeof ncrsForCaisson==='function'?ncrsForCaisson(n):[];
      if(!list.length)return base;
      const buttons=list.map(({id},i)=>`<button type="button" onclick="openFullNcrExcel('${String(n).replace(/'/g,"\\'")}',${i})" style="width:100%;margin:7px 0;padding:13px;border:0;border-radius:11px;background:#083a73;color:#fff;font-size:15px;font-weight:900">OPEN FULL NCR EXCEL DETAILS${id?` — ${esc(id)}`:''}</button>`).join('');
      return base+`<div class="card" style="border:2px solid #083a73"><h2 style="font-size:17px">Full NCR Excel Record</h2><div class="tiny" style="margin-bottom:7px">Opens a separate window. Every Excel header is displayed on its own line.</div>${buttons}</div>`;
    };
    const title=document.querySelector('.top .title');
    if(title)title.innerHTML=`FieldVerify Pro <span style="font-size:11px;opacity:.75">v${BUILD_VERSION} stable</span>`;
    document.title=`FieldVerify Pro v${BUILD_VERSION}`;
    localStorage.setItem('fieldVerifyInstalledBuild',BUILD_VERSION);
    if(typeof showTarget==='function')showTarget();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80));
  else setTimeout(install,80);
})();
