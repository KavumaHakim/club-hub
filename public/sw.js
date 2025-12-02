
const CACHE_NAME = 'ict-club-hub-v7';
const DATA_CACHE_NAME = 'ict-club-data-v7';

// Core assets to cache (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  // Add other static assets if necessary, e.g. logos
];

// Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches and notify clients if new SW
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

      // Claim clients immediately
      await self.clients.claim();

      // Notify all clients about the new service worker
      const allClients = await self.clients.matchAll();
      for (const client of allClients) {
        client.postMessage({ type: 'SW_UPDATED' });
      }
    })()
  );
});

// Fetch: handle navigation, API caching, and offline login persistence
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Page navigation fallback (Network First -> Cache Fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. API caching (user data, etc.) - Network First, then Cache
  // We check for '/api/' OR 'supabase.co' to cover both local and Supabase requests
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(response => {
            // Clone the response before reading it, as it can only be consumed once
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // If network fails, try to return the cached response
            return caches.match(event.request);
          })
      )
    );
    return;
  }

  // 3. Static Assets / Fallback: Cache First, then Network
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Optional: listen for messages from clients (frontend)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // allow frontend to trigger immediate activation
  }
});
