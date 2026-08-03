const CACHE='foundation-inspector-fixed-v12';
const CORE=[
  './',
  './index.html',
  './team-v3.js',
  './gps-diagnostics.js',
  './manifest.webmanifest',
  'https://drillerguy.github.io/-ORD-Caisson-Inspector/caisson-plan.png',
  'https://drillerguy.github.io/-ORD-Caisson-Inspector/index.html'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(async cache=>{
        for(const url of CORE){
          try{await cache.add(new Request(url,{cache:'reload'}));}
          catch(error){console.warn('Cache skipped',url,error);}
        }
      })
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
