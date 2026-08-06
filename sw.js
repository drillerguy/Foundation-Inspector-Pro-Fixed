const CACHE='foundation-inspector-send-pdf-v30';
const BUTTON=`<style>#sendAllPdfNow{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483647;background:#b42318;color:#fff;border:0;border-radius:14px;padding:18px 14px;font:900 19px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 5px 18px #0008}</style><button id="sendAllPdfNow" onclick="location.href='./recovery.html?from=main-v30'">SEND PDF WITH ALL DATA & PICTURES</button>`;
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 const main=e.request.mode==='navigate'&&(u.pathname.endsWith('/Foundation-Inspector-Pro-Fixed/')||u.pathname.endsWith('/Foundation-Inspector-Pro-Fixed/index.html'));
 if(main){e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{let h=await r.text();if(!h.includes('sendAllPdfNow'))h=h.replace(/<\/body>/i,BUTTON+'</body>');return new Response(h,{status:r.status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}));return;}
 e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
});
