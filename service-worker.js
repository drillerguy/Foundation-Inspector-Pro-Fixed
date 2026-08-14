const CACHE='fieldverify-pro-v115-self-healing-update';
const REQUIRED_BUILD='10.15';
const CORE=[
  './','./index.html','./ncr-data-guard-v1012.js','./ncr-preload.js','./ncr-ui-patch.js','./ncr-import-fix-v108.js','./ncr-engineer-fix-v109.js','./ncr-full-window-v1011.js','./pdf-backup-v1014.js','./caisson-plan.png','./caisson-data.js',
  './xlsx.full.min.js','./pdf.min.mjs','./pdf.worker.min.mjs','./pdf-lib.min.js','./manifest.webmanifest','./recovery.html'
];

// Cache files one at a time so one temporarily unavailable GitHub Pages asset
// can never prevent a new service worker from installing.
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async url=>{
    try{
      const request=new Request(url,{cache:'reload'});
      const response=await fetch(request);
      if(response&&response.ok)await cache.put(url,response.clone());
    }catch(err){console.warn('Precache skipped',url,err)}
  }));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients){
    try{client.postMessage({type:'FIELDVERIFY_BUILD',version:REQUIRED_BUILD,forceReload:true})}catch{}
    // Force an open stale 10.12/10.14 page through the new worker immediately.
    try{await client.navigate(client.url)}catch{}
  }
})()));

function injectBeforeRealBodyClose(html,tag){
  const lower=html.toLowerCase();
  const at=lower.lastIndexOf('</body>');
  return at>=0?html.slice(0,at)+tag+html.slice(at):html+tag;
}

async function patchHtml(response){
  if(!response)return response;
  let patched=await response.text();
  patched=patched.replace(/v(?:7\.3|7\.5|7\.6|10\.4|10\.5|10\.6|10\.7|10\.8|10\.9|10\.10|10\.11|10\.12|10\.13|10\.14)\s+stable/gi,'v10.15 stable');
  const tags=[
    '<script src="./ncr-data-guard-v1012.js?v=10.15"></script>',
    '<script src="./ncr-preload.js?v=10.15"></script>',
    '<script src="./ncr-ui-patch.js?v=10.15"></script>',
    '<script src="./ncr-import-fix-v108.js?v=10.15"></script>',
    '<script src="./ncr-engineer-fix-v109.js?v=10.15"></script>',
    '<script src="./ncr-full-window-v1011.js?v=10.15"></script>',
    '<script src="./pdf-backup-v1014.js?v=10.15"></script>'
  ];
  for(const tag of tags){
    const file=tag.match(/src="\.\/(.*?)\?/)[1];
    const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(escaped+'(?:\\?v=[^"\\\'<> ]+)?','g');
    if(patched.includes(file))patched=patched.replace(re,file+'?v=10.15');
    else patched=injectBeforeRealBodyClose(patched,tag);
  }
  patched=patched.replace(/ncr-engineer-fix-v108\.js(?:\?v=[^"\'<> ]+)?/g,'ncr-engineer-fix-v109.js?v=10.15');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate'}});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{return await patchHtml(await fetch(event.request,{cache:'no-store'}))}
      catch{return await patchHtml(await caches.match('./index.html'))}
    })());
    return;
  }
  if(/\/(ncr-data-guard-v1012|ncr-preload|ncr-ui-patch|ncr-import-fix-v108|ncr-engineer-fix-v109|ncr-full-window-v1011|pdf-backup-v1014)\.js$/.test(url.pathname)){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./'+url.pathname.split('/').pop(),copy))}
      return response;
    }).catch(()=>caches.match('./'+url.pathname.split('/').pop())));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
    return response;
  })));
});

self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
