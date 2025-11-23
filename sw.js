const CACHE_NAME = 'ict-club-hub-v1';
const DATA_CACHE_NAME = 'ict-club-data-v1';

// Assets to precache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/favicon.svg'
];

// Domains that serve static libraries (CDNs)
const STATIC_DOMAINS = [
  'cdn.tailwindcss.com',
  'aistudiocdn.com',
  'esm.sh',
  'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Supabase API Requests (Activities, Feed, etc.)
  // Strategy: Network First, Fallback to Cache
  if (url.hostname.includes('supabase.co') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, clone and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Static CDN Assets (React, Tailwind, etc.)
  // Strategy: Stale While Revalidate (Return cache fast, update in background)
  if (STATIC_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. App Shell / Local Assets
  // Strategy: Cache First, Fallback to Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
