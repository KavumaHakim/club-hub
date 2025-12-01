// ============================
// Service Worker: sw.js
// ============================

// Versioned caches
const CACHE_VERSION = 'v7'; // Increment this on each deploy
const CACHE_NAME = `ict-club-hub-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `ict-club-data-${CACHE_VERSION}`;

// Assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

const STATIC_DOMAINS = [
  'cdn.tailwindcss.com',
  'aistudiocdn.com',
  'esm.sh',
  'cdn.jsdelivr.net'
];

// ----------------------------
// Install: Precache assets
// ----------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE_ASSETS.map(asset => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

// ----------------------------
// Activate: Cleanup old caches & notify clients
// ----------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );

      // Claim clients immediately
      await self.clients.claim();

      // Notify all clients that a new version is available
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
      }
    })()
  );
});

// ----------------------------
// Fetch: Handle all requests
// ----------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle HTTP(S) requests
  const isHttp = url.protocol.startsWith('http');
  if (!isHttp) return;

  // --- 1. Network-first for HTML/navigation ---
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // --- 2. Cache-first for pre-cached static assets ---
  if (PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // --- 3. Static CDN Assets (Stale-While-Revalidate) ---
  if (STATIC_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchAndCache = fetch(event.request)
          .then(networkResponse => {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchAndCache;
      })
    );
    return;
  }

  // --- 4. API/Data requests (Network-first) ---
  if (url.hostname.includes('supabase.co') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // --- 5. Dynamic caching for /assets/ (Cache-first with fallback) ---
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(networkResponse => {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return networkResponse;
          })
          .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  // --- 6. Fallback for other requests ---
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});