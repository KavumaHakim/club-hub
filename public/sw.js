const CACHE_NAME = 'ict-club-hub-v10';
const DATA_CACHE_NAME = 'ict-club-data-v10';

// Install: Cache HTML and dynamic asset files
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Always cache the root page
      await cache.add('/');

      // Fetch and parse index.html to detect hashed assets
      const resp = await fetch('/index.html');
      const html = await resp.text();

      // Match Vercel/Vite assets like /assets/index-xxxx.js
      const assetRegex = /\/assets\/[a-zA-Z0-9_\-]+\.(?:js|css|png|svg|jpg|jpeg|webp)/g;
      const assets = html.match(assetRegex) || [];

      console.log('Dynamic assets cached:', assets);

      // Cache all discovered assets
      await cache.addAll(assets);
    })()
  );

  self.skipWaiting();
});

// Activate: cleanup old caches + notify update
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })()
  );

  // Let clients know a new SW is ready
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });

  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', event => {
  const req = event.request;

  // Handle navigation: network first, fallback to cached HTML
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          // Cache fresh index.html for future offline loads
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put('/index.html', copy));
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Handle API requests safely (only GET can be cached)
  if (req.url.includes('/api/')) {
    if (req.method !== 'GET') {
      // Never cache POST, PUT, PATCH, DELETE
      event.respondWith(fetch(req).catch(() => new Response(null)));
      return;
    }

    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async cache => {
        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cache.match(req);
        }
      })
    );
    return;
  }

  // Cache assets under /assets/
  if (req.url.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(cached => {
        return (
          cached ||
          fetch(req)
            .then(resp => {
              if (resp.status === 200) {
                const copy = resp.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, copy));
              }
              return resp;
            })
            .catch(() => cached)
        );
      })
    );
    return;
  }

  // Default: cache-first fallback
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

// Listen for skip-waiting command
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
