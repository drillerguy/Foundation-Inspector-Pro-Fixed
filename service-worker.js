const CACHE='fieldverify-pro-v1021';
const REQUIRED_BUILD='10.2';
const CORE=['./','./index.html','./ncr-ui-patch.js','./backup-zip-v10.js','./caisson-plan.png','./caisson-data.js','./xlsx.full.min.js','./pdf.min.mjs','./pdf.worker.min.mjs','./pdf-lib.min.js','./manifest.webmanifest','./recovery.html'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function versionOnly(response){
  const text=await response.text();
  const patched=text.replace(/v7\.3 stable/g,'v10.2 stable').replace(/v7\.5 stable/g,'v10.2 stable');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(versionOnly).catch(async()=>{
      const cached=await caches.match('./index.html');
      return cached?versionOnly(cached):new Response('Offline',{status:503});
    }));
    return;
  }

  if(url.pathname.endsWith('/backup-zip-v10.js')||url.pathname.endsWith('/ncr-ui-patch.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })));
});
