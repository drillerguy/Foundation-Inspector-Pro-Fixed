const CACHE='fieldverify-pro-v75-lock-1';
const REQUIRED_BUILD='7.5';
const CORE=[
  './',
  './index.html',
  './ncr-ui-patch.js',
  './caisson-plan.png',
  './caisson-data.js',
  './xlsx.full.min.js',
  './pdf.min.mjs',
  './pdf.worker.min.mjs',
  './pdf-lib.min.js',
  './manifest.webmanifest',
  './recovery.html'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();

    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      client.postMessage({type:'FIELDVERIFY_BUILD',version:REQUIRED_BUILD,forceReload:true});
    }
  })());
});

async function patchHtml(response){
  if(!response)return response;
  const text=await response.text();
  let patched=text;

  if(!patched.includes('ncr-ui-patch.js')){
    patched=patched.replace('</body>','<script src="./ncr-ui-patch.js?v=7.5"></script></body>');
  }else{
    patched=patched.replace(/ncr-ui-patch\.js(?:\?v=[^"'<> ]+)?/g,'ncr-ui-patch.js?v=7.5');
  }

  return new Response(patched,{
    status:response.status,
    statusText:response.statusText,
    headers:{
      'content-type':'text/html; charset=utf-8',
      'cache-control':'no-store, no-cache, must-revalidate'
    }
  });
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        return await patchHtml(response);
      }catch{
        const cached=await caches.match('./index.html');
        return await patchHtml(cached);
      }
    })());
    return;
  }

  if(url.pathname.endsWith('/ncr-ui-patch.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./ncr-ui-patch.js')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});
