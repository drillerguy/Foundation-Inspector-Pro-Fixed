/* FieldVerify Pro v10.25.44 service worker retirement build.
   No caching, HTML rewriting, script injection, or navigation interception.
   Only removes old FieldVerify app caches and unregisters itself. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{const keys=await caches.keys();await Promise.all(keys.filter(k=>/fieldverify/i.test(k)).map(k=>caches.delete(k)))}catch{}
  try{await self.clients.claim()}catch{}
  try{await self.registration.unregister()}catch{}
})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
