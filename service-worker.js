/* FieldVerify Pro v10.25.43 service worker retirement build.
   This worker intentionally does not cache, rewrite, inject, or intercept requests.
   It retires older FieldVerify caches and unregisters itself so Safari loads one direct app build. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>/fieldverify/i.test(k)).map(k=>caches.delete(k)));
  }catch{}
  try{await self.clients.claim()}catch{}
  try{await self.registration.unregister()}catch{}
})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
