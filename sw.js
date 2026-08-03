const CACHE = 'foundation-inspector-fixed-v11';
const CORE = [
  './',
  './index.html',
  './team-v3.js',
  './gps-diagnostics.js',
  './manifest.webmanifest',
  '../-ORD-Caisson-Inspector/caisson-plan.png',
  '../-ORD-Caisson-Inspector/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (
    requestUrl.origin === self.location.origin &&
    (
      requestUrl.pathname.endsWith('/Foundation-Inspector-Pro-Fixed/') ||
      requestUrl.pathname.endsWith('/Foundation-Inspector-Pro-Fixed/index.html')
    )
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(async response => {
          let html = await response.text();

          if (!html.includes('gps-diagnostics.js')) {
            html = html.replace(
              '</body>',
              '<script src="./gps-diagnostics.js?v=11"></script></body>'
            );
          }

          return new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'cache-control': 'no-store'
            }
          });
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});