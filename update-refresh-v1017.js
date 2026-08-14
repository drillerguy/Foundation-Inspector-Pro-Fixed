(()=>{
  const UPDATE_TEXT='App update ready';
  const toast=document.getElementById('toast');
  if(!toast)return;

  function showRefreshButton(){
    if(!String(toast.textContent||'').includes(UPDATE_TEXT))return;
    clearTimeout(toast._x);
    toast.innerHTML='<span>App update ready</span><button id="appUpdateRefreshBtn" type="button" style="margin-left:10px;padding:8px 12px;border:0;border-radius:8px;background:#16803d;color:#fff;font-weight:900">REFRESH NOW</button>';
    toast.classList.remove('hidden');
    const button=document.getElementById('appUpdateRefreshBtn');
    if(!button)return;
    button.onclick=async()=>{
      button.disabled=true;
      button.textContent='UPDATING…';
      try{
        const reg=await navigator.serviceWorker.getRegistration();
        if(reg?.waiting)reg.waiting.postMessage('SKIP_WAITING');
        if(reg?.update)await reg.update().catch(()=>{});
      }catch{}
      setTimeout(()=>window.location.reload(),250);
    };
  }

  const observer=new MutationObserver(showRefreshButton);
  observer.observe(toast,{childList:true,subtree:true,characterData:true});
  showRefreshButton();
})();
