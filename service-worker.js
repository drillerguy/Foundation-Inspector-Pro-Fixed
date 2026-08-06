const CACHE='fieldverify-pro-v27-send-button';
const CORE=['./','./index.html','./caisson-plan.png','./caisson-data.js','./xlsx.full.min.js','./pdf.min.mjs','./pdf.worker.min.mjs','./pdf-lib.min.js','./manifest.webmanifest','./recovery.html'];

const SEND_BUTTON=`
<style id="fieldverify-send-style">
#fieldverifySendEverything{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99999;border:0;border-radius:15px;padding:17px 14px;background:#b42318;color:#fff;font:900 19px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;box-shadow:0 5px 18px #0007}
</style>
<button id="fieldverifySendEverything" type="button">SEND EVERYTHING WITH PICTURES</button>
<script>
(function(){var b=document.getElementById('fieldverifySendEverything');if(b)b.addEventListener('click',function(){location.href='./recovery.html?from=main&v=27';});})();
<\/script>`;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  const url=new URL(event.request.url);
  const isMain=url.pathname.endsWith('/Foundation-Inspector-Pro-Fixed/')||url.pathname.endsWith('/Foundation-Inspector-Pro-Fixed/index.html');

  if(event.request.mode==='navigate'&&isMain){
    event.respondWith(fetch(new Request(event.request,{cache:'reload'})).then(async response=>{
      if(!response.ok)return response;
      let html=await response.text();
      if(!html.includes('fieldverifySendEverything'))html=html.replace(/<\/body>/i,SEND_BUTTON+'\n</body>');
      const headers=new Headers(response.headers);headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(fetch(new Request(event.request,{cache:'reload'})).catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith(fetch(new Request(event.request,{cache:'no-cache'})).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});
