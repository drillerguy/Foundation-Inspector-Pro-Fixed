(()=>{
  const KEY='fieldVerifyNcrMarkersVisible';
  let visible=localStorage.getItem(KEY)!=='false';

  function addStyles(){
    if(document.getElementById('ncrUiPatchStyle'))return;
    const style=document.createElement('style');
    style.id='ncrUiPatchStyle';
    style.textContent=`
      #ncrRfiToggle{font-size:10px;line-height:1.05;min-width:54px}
      .ncr-reason-notes{background:#fff0f0;border:1px solid #d89b9b;border-radius:10px;padding:9px;margin:0 0 9px;font-size:12px;line-height:1.35}
      .ncr-reason-notes b{color:#8d1b1b}
    `;
    document.head.appendChild(style);
  }

  const originalStateClass=window.stateClass;
  if(typeof originalStateClass==='function'){
    window.stateClass=function(r,n){
      let cls=originalStateClass(r,n);
      if(!visible)cls=cls.replace(/\s+ncr-(open|pending|cleared)/g,'');
      return cls;
    };
  }

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
      if(typeof window.renderPins==='function')window.renderPins();
      if(typeof window.toast==='function')window.toast(visible?'NCR / RFI map colors shown':'NCR / RFI map colors hidden');
    };
    const zoomOut=document.getElementById('zoomOut');
    controls.insertBefore(b,zoomOut||null);
    updateToggle();
  }

  function reasonRows(n){
    if(typeof window.ncrsForCaisson!=='function'||typeof window.findField!=='function')return [];
    return window.ncrsForCaisson(n).map(({row,id})=>{
      const issue=String(window.findField(row,['Description','NCR Description','Issue Description','Issue'])||'').trim();
      return issue?{id,issue}:null;
    }).filter(Boolean);
  }

  function addReasonToNotes(){
    const notes=document.getElementById('notes');
    if(!notes||document.querySelector('.ncr-reason-notes'))return;
    const n=window.selected??window.nearest;
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
      strong.textContent=`${id}: `;
      line.appendChild(strong);
      line.appendChild(document.createTextNode(issue));
      box.appendChild(line);
    });
    notes.parentNode.insertBefore(box,notes);
  }

  const originalShowTarget=window.showTarget;
  if(typeof originalShowTarget==='function'){
    window.showTarget=function(...args){
      const result=originalShowTarget.apply(this,args);
      addReasonToNotes();
      return result;
    };
  }

  addStyles();
  installToggle();
  addReasonToNotes();
  if(typeof window.renderPins==='function')window.renderPins();
})();
