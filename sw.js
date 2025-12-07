// ============================
// Service Worker: sw.js
// ============================

const CACHE_VERSION = 'v13'; // Increment this on each deploy
const CACHE_NAME = `ict-club-hub-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `ict-club-data-${CACHE_VERSION}`;

// Core assets to pre-cache (the app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Domains for CDN assets
const STATIC_DOMAINS = [
  'aistudiocdn.com',
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'api.dicebear.com',
  'cdn.jsdelivr.net' // For pyodide
];

// ----------------------------
// Install: Pre-cache assets
// ----------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(asset => cache.add(asset).catch(err => console.warn(`Failed to cache ${asset}:`, err)))
      );
    })
  );
  self.skipWaiting(); // Activate new worker immediately
});

// ----------------------------
// Activate: Cleanup old caches & notify clients
// ----------------------------
self.addEventListener('activate', (event) => {
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
      await self.clients.claim();
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({ type: 'SW_UPDATED' });
      }
    })()
  );
});

// ----------------------------
// Fetch: Handle all requests
// ----------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation: Network-first, fallback to /index.html from cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. API Data (Supabase): Network-first, fallback to cache (for GET)
  if (url.hostname.includes('supabase.co')) {
    if (req.method !== 'GET') {
      event.respondWith(fetch(req));
      return;
    }
    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // **FIXED**: Correctly open the data cache first, then match.
          const dataCache = await caches.open(DATA_CACHE_NAME);
          const cachedResponse = await dataCache.match(req);
          return cachedResponse;
        })
    );
    return;
  }

  // 3. Static CDN Assets: Cache-first, network fallback for robustness
  if (STATIC_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(req).then(cachedResponse => {
          // Return from cache if found
          if (cachedResponse) {
            return cachedResponse;
          }
          // Otherwise, fetch from network, cache it, and return response
          return fetch(req).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 4. Other assets: Cache-first fallback
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      return cachedResponse || fetch(req).then(networkResponse => {
        if (req.method === 'GET' && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      });
    })
  );
});

// --- 5. Message Listener for client commands ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});