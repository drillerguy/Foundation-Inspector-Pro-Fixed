const CACHE='fieldverify-pro-v109-engineer-fix';
const REQUIRED_BUILD='10.9';
const CORE=[
  './','./index.html','./ncr-ui-patch.js','./ncr-import-fix-v108.js','./ncr-engineer-fix-v109.js','./caisson-plan.png','./caisson-data.js',
  './xlsx.full.min.js','./pdf.min.mjs','./pdf.worker.min.mjs','./pdf-lib.min.js','./manifest.webmanifest','./recovery.html'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients) client.postMessage({type:'FIELDVERIFY_BUILD',version:REQUIRED_BUILD,forceReload:true});
})()));
async function patchHtml(response){
  if(!response)return response;
  let patched=await response.text();
  patched=patched.replace(/v(?:7\.3|7\.5|7\.6|10\.4|10\.5|10\.6|10\.7|10\.8)\s+stable/gi,'v10.9 stable');
  const tags=[
    '<script src="./ncr-ui-patch.js?v=10.9"></script>',
    '<script src="./ncr-import-fix-v108.js?v=10.9"></script>',
    '<script src="./ncr-engineer-fix-v109.js?v=10.9"></script>'
  ];
  for(const tag of tags){
    const file=tag.match(/src="\.\/(.*?)\?/)[1];
    const re=new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\?v=[^"\\\'<> ]+)?','g');
    if(patched.includes(file)) patched=patched.replace(re,file+'?v=10.9');
    else patched=patched.replace(/<\/body>/i,tag+'</body>');
  }
  patched=patched.replace(/ncr-engineer-fix-v108\.js(?:\?v=[^"\'<> ]+)?/g,'ncr-engineer-fix-v109.js?v=10.9');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate'}});
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url); if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{try{return await patchHtml(await fetch(event.request,{cache:'no-store'}));}catch{return await patchHtml(await caches.match('./index.html'));}})()); return;
  }
  if(/\/(ncr-ui-patch|ncr-import-fix-v108|ncr-engineer-fix-v109)\.js$/.test(url.pathname)){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./'+url.pathname.split('/').pop()))); return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;})));
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
