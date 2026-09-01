/* FieldVerify Pro v10.25.45 passive worker.
   Intentionally does not cache, rewrite, inject, claim, reload, or unregister.
   Keeping one inert registration prevents iOS from repeatedly installing/retiring workers. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',()=>{});
self.addEventListener('fetch',()=>{});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
