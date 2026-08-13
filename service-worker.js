const CACHE='fieldverify-pro-v30';
const CORE=['./','./index.html','./ncr-ui-patch.js','./caisson-plan.png','./caisson-data.js','./xlsx.full.min.js','./pdf.min.mjs','./pdf.worker.min.mjs','./pdf-lib.min.js','./manifest.webmanifest','./recovery.html'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function withNcrPatch(response){
  if(!response)return response;
  const text=await response.text();
  const patched=text.includes('ncr-ui-patch.js')?text:text.replace('</body>','<script src="./ncr-ui-patch.js"></script></body>');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return await withNcrPatch(response);
      }catch{
        const cached=await caches.match('./index.html');
        return await withNcrPatch(cached);
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})));
});