
const CACHE_NAME = 'ict-club-hub-v12';
const DATA_CACHE_NAME = 'ict-club-data-v12';

// App shell files to be pre-cached.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Domains for CDN assets to be cached with stale-while-revalidate
const CDN_DOMAINS = [
  'aistudiocdn.com',
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'api.dicebear.com' // for avatars
];

// Install: Pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches and notify clients of the update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      // Notify clients that a new service worker is active
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
  self.clients.claim();
});

// Fetch: Handle all network requests with different caching strategies
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 0. SEO / Meta files: Network only (never cache)
  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
    event.respondWith(fetch(req));
    return;
  }

  // 1. Navigation: Network first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          // Cache the fresh page for offline access
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. Supabase API calls (for auth and data): Network falling back to cache
  if (url.hostname.includes('supabase.co')) {
    // Only cache GET requests to avoid issues with mutations
    if (req.method !== 'GET') {
      event.respondWith(fetch(req));
      return;
    }

    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          // If successful, update the cache
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then(cache => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network fails, try to serve from cache
          const cachedResponse = await caches.match(req);
          return cachedResponse || new Response(null, { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 3. CDN Assets: Stale-While-Revalidate
  if (CDN_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(req).then(cachedResponse => {
          const fetchPromise = fetch(req).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          });
          // Return cached response immediately, then fetch update in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // 4. Default for other requests: Cache-first fallback
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(networkResponse => {
        // Dynamically cache other successful GET requests
        if (req.method === 'GET' && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      });
    })
  );
});

// Listen for a command from the client to skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ClubHub', body: event.data?.text() || '' };
  }

  const title = data.title || 'ClubHub';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
