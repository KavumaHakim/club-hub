// ============================
// Service Worker: sw.js
// ============================

const CACHE_VERSION = 'v12'; // Increment this on each deploy
const CACHE_NAME = `ict-club-hub-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `ict-club-data-${CACHE_VERSION}`;

// Core assets to pre-cache (the app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Domains for CDN assets (stale-while-revalidate)
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
      // Use Promise.allSettled to ensure installation completes even if one asset fails.
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
      // Remove any caches that are not the current ones
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );

      // Take control of all open clients
      await self.clients.claim();

      // Notify clients that a new version is available for refresh
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

  // Only handle HTTP(S) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // --- 1. Navigation: Network-first, fallback to cache ---
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          // If successful, cache the new page and return it
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return response;
        })
        .catch(() => {
          // If network fails, return the cached index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // --- 2. API Data (Supabase): Network-first, fallback to cache (for GET) ---
  if (url.hostname.includes('supabase.co')) {
    // For mutations, always go to network. Don't cache.
    if (req.method !== 'GET') {
      event.respondWith(fetch(req));
      return;
    }

    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          // If successful, update the data cache
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, serve from data cache
          return caches.match(req, { cacheName: DATA_CACHE_NAME });
        })
    );
    return;
  }

  // --- 3. Static CDN Assets: Stale-While-Revalidate ---
  if (STATIC_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(req).then(cachedResponse => {
          const fetchPromise = fetch(req).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          });
          // Return cached response immediately, then update in the background.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // --- 4. Other assets (pre-cached or dynamically cached): Cache-first ---
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // If not in cache, fetch, cache, and return
      return fetch(req).then(networkResponse => {
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
