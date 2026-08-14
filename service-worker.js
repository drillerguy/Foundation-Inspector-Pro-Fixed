const CACHE='fieldverify-pro-v106-lock-1';
const REQUIRED_BUILD='10.6';
const CORE=[
  './',
  './index.html',
  './ncr-preload.js',
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

  patched=patched.replace(/v(?:7\.3|7\.5|10\.4|10\.5)\s+stable/gi,'v10.6 stable');

  const closingBody=patched.toLowerCase().lastIndexOf('</body>');
  const preloadTag='<script src="./ncr-preload.js?v=10.6"></script>';
  const patchTag='<script src="./ncr-ui-patch.js?v=10.6"></script>';

  if(!patched.includes('ncr-preload.js')){
    if(closingBody>=0)patched=patched.slice(0,closingBody)+preloadTag+patched.slice(closingBody);
    else patched+=preloadTag;
  }else{
    patched=patched.replace(/ncr-preload\.js(?:\?v=[^"'<> ]+)?/g,'ncr-preload.js?v=10.6');
  }

  const closingBody2=patched.toLowerCase().lastIndexOf('</body>');
  if(!patched.includes('ncr-ui-patch.js')){
    if(closingBody2>=0)patched=patched.slice(0,closingBody2)+patchTag+patched.slice(closingBody2);
    else patched+=patchTag;
  }else{
    patched=patched.replace(/ncr-ui-patch\.js(?:\?v=[^"'<> ]+)?/g,'ncr-ui-patch.js?v=10.6');
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

  if(url.pathname.endsWith('/ncr-ui-patch.js')||url.pathname.endsWith('/ncr-preload.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(url.pathname.endsWith('/ncr-preload.js')?'./ncr-preload.js':'./ncr-ui-patch.js')));
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
