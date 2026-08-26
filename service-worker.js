const CACHE='fieldverify-pro-v156-caisson-status-fix';
const REQUIRED_BUILD='10.25.6';
const CORE=[
  './','./index.html','./version-lock-v1024.js','./caisson-final-workbook-import-v10253.js','./poured-status-v10254.js',
  './xlsx.full.min.js','./caisson-plan.png','./caisson-data.js','./pdf-lib.min.js','./manifest.webmanifest',
  './backup-zip-v10.js','./ncr-data-guard-v1012.js','./ncr-preload.js','./ncr-ui-patch.js','./ncr-import-fix-v108.js','./ncr-engineer-fix-v109.js','./ncr-full-window-v1011.js',
  './pdf-backup-v1014.js','./pdf-photo-fix-v1019.js','./photo-integrity-v1021.js','./photo-recovery-import-v1023.js','./office-report-split-v103.js',
  './drawing-manager-v1024.js','./drawing-delete-page-v1024.js','./cloud-sync-v1024.js','./cloud-photo-accelerator-v1024.js','./hosted-backup-v1024.js','./backup-choice-v1024.js',
  './background-drawing-backup-v1024.js','./project-header-v1024.js','./project-delete-v1024.js','./project-home-photo-count-v1024.js','./manager-review-v1024.js',
  './cloud-auth-fix-v1025.js','./cloud-access-v1026.js','./invite-email-v1024.js','./photo-viewer-v1027.js','./gps-live-v1028.js','./update-refresh-v1017.js'
];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async url=>{try{const r=await fetch(new Request(url,{cache:'reload'}));if(r&&r.ok)await cache.put(url,r.clone())}catch{}}));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients){try{client.postMessage({type:'FIELDVERIFY_BUILD',version:REQUIRED_BUILD,forceReload:true})}catch{}}
})()));
function inject(html,tag){const at=html.toLowerCase().lastIndexOf('</body>');return at>=0?html.slice(0,at)+tag+html.slice(at):html+tag}
async function patchHtml(response){
  let html=await response.text();
  html=html.replace(/v(?:7|10)\.\d+(?:\.\d+)?\s+stable/gi,'v10.25.6 stable');
  const required=[
    '<script src="./version-lock-v1024.js?v=10.25.6"></script>',
    '<script src="./caisson-final-workbook-import-v10253.js?v=10.25.6"></script>',
    '<script src="./poured-status-v10254.js?v=10.25.6"></script>'
  ];
  for(const tag of required){const file=tag.match(/src="\.\/(.*?)\?/)[1];const re=new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\?v[^"\\\'<> ]*)?','g');if(html.includes(file))html=html.replace(re,file+'?v=10.25.6');else html=inject(html,tag)}
  return new Response(html,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate'}});
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{try{const r=await fetch(event.request,{cache:'no-store'});const p=await patchHtml(r);const c=await caches.open(CACHE);await c.put('./index.html',p.clone());await c.put('./',p.clone());return p}catch{const cached=await caches.match('./index.html',{cacheName:CACHE})||await caches.match('./',{cacheName:CACHE});return cached?patchHtml(cached):new Response('FieldVerify Pro is offline.',{status:503})}})());return;
  }
  if(/\/(version-lock-v1024|caisson-final-workbook-import-v10253|poured-status-v10254|update-refresh-v1017|cloud-sync-v1024|cloud-auth-fix-v1025|cloud-access-v1026)\.js$/.test(url.pathname)){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(async r=>{if(r&&r.ok){const c=await caches.open(CACHE);await c.put('./'+url.pathname.split('/').pop(),r.clone())}return r}).catch(()=>caches.match('./'+url.pathname.split('/').pop(),{cacheName:CACHE})));return;
  }
  event.respondWith(caches.match(event.request,{cacheName:CACHE}).then(cached=>cached||fetch(event.request).then(async r=>{if(r&&r.ok){const c=await caches.open(CACHE);await c.put(event.request,r.clone())}return r})));
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
