/* FieldVerify Pro v10.25.47 passive worker.
   Intentionally does not cache, rewrite, inject, claim, reload, or unregister. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',()=>{});
self.addEventListener('fetch',()=>{});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
