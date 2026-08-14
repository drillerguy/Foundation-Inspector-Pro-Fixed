const CACHE='fieldverify-pro-v112-ncr-data-fix';
const REQUIRED_BUILD='10.12';
const CORE=[
  './','./index.html','./ncr-data-guard-v1012.js','./ncr-preload.js','./ncr-ui-patch.js','./ncr-import-fix-v108.js','./ncr-engineer-fix-v109.js','./ncr-full-window-v1011.js','./caisson-plan.png','./caisson-data.js',
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
function injectBeforeRealBodyClose(html,tag){
  const lower=html.toLowerCase();
  const at=lower.lastIndexOf('</body>');
  return at>=0?html.slice(0,at)+tag+html.slice(at):html+tag;
}
async function patchHtml(response){
  if(!response)return response;
  let patched=await response.text();
  patched=patched.replace(/v(?:7\.3|7\.5|7\.6|10\.4|10\.5|10\.6|10\.7|10\.8|10\.9|10\.10|10\.11)\s+stable/gi,'v10.12 stable');
  const tags=[
    '<script src="./ncr-data-guard-v1012.js?v=10.12"></script>',
    '<script src="./ncr-preload.js?v=10.12"></script>',
    '<script src="./ncr-ui-patch.js?v=10.12"></script>',
    '<script src="./ncr-import-fix-v108.js?v=10.12"></script>',
    '<script src="./ncr-engineer-fix-v109.js?v=10.12"></script>',
    '<script src="./ncr-full-window-v1011.js?v=10.12"></script>'
  ];
  for(const tag of tags){
    const file=tag.match(/src="\.\/(.*?)\?/)[1];
    const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(escaped+'(?:\\?v=[^"\\\'<> ]+)?','g');
    if(patched.includes(file)) patched=patched.replace(re,file+'?v=10.12');
    else patched=injectBeforeRealBodyClose(patched,tag);
  }
  patched=patched.replace(/ncr-engineer-fix-v108\.js(?:\?v=[^"\'<> ]+)?/g,'ncr-engineer-fix-v109.js?v=10.12');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate'}});
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url); if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{try{return await patchHtml(await fetch(event.request,{cache:'no-store'}));}catch{return await patchHtml(await caches.match('./index.html'));}})()); return;
  }
  if(/\/(ncr-data-guard-v1012|ncr-preload|ncr-ui-patch|ncr-import-fix-v108|ncr-engineer-fix-v109|ncr-full-window-v1011)\.js$/.test(url.pathname)){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./'+url.pathname.split('/').pop()))); return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;})));
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
