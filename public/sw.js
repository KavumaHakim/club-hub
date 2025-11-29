// ============================
// Service Worker: sw.js
// ============================

const CACHE_NAME = 'ict-club-hub-v4';
const DATA_CACHE_NAME = 'ict-club-data-v4';

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
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ----------------------------
// Activate: Cleanup old caches
// ----------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ----------------------------
// Fetch: Handle all requests
// ----------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // --- 1. Pyodide Assets (Cache First) ---
  if (url.href.includes('pyodide')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request)
          .then(networkResponse => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // --- 2. Supabase API Requests (Network First, Fallback Cache) ---
  if (url.hostname.includes('supabase.co') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // --- 3. Static CDN Assets (Stale-While-Revalidate) ---
  if (STATIC_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchAndCache = fetch(event.request)
          .then(networkResponse => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchAndCache;
      })
    );
    return;
  }

  // --- 4. Dynamic caching for build assets (/assets/) ---
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request)
          .then(networkResponse => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => {
            // Return empty JS/CSS if offline to prevent errors
            if (event.request.destination === 'script' || event.request.destination === 'style') {
              return new Response('', { status: 503, statusText: 'Offline' });
            }
            return caches.match('/index.html'); // fallback for SPA navigation
          });
      })
    );
    return;
  }

  // --- 5. App Shell / Local Assets (Cache First with Offline Fallback) ---
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request).catch(() => {
        // Navigation fallback to index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // Non-essential requests return empty response
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
