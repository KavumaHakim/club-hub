// ClubHub service worker.
//
// Offline copies always match the latest deploy: the build stamps BUILD_ID and
// PRECACHE_MANIFEST below (vite.config.ts, precacheServiceWorker), so every deploy
// changes this file, the browser installs the new worker, and it saves every page
// and file of that build before taking over. Old builds' files are deleted on
// activate. In dev the placeholders stay as they are and the page doesn't
// register a worker on localhost.

const BUILD_ID = 'dev';
const PRECACHE_MANIFEST = self.__PRECACHE_MANIFEST__ || [];

// This build's app shell and code. Replaced wholesale by the next build.
const CACHE_NAME = `ict-club-hub-${BUILD_ID}`;
// Kept across builds: Supabase reads (offline fallback) and CDN files, which
// include the ~10 MB Python runtime that shouldn't download again every deploy.
const DATA_CACHE_NAME = 'ict-club-data-v13';
const CDN_CACHE_NAME = 'ict-club-cdn-v1';
const KEEP = [CACHE_NAME, DATA_CACHE_NAME, CDN_CACHE_NAME];

const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

// Hosts answer with "Vary: Origin", and module scripts are requested with an Origin
// header the saved copies don't have, so a strict match would miss every one offline.
const MATCH = { ignoreVary: true };

// Domains for CDN assets to be cached with stale-while-revalidate
const CDN_DOMAINS = [
  'aistudiocdn.com',
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'api.dicebear.com', // for avatars
  'cdn.jsdelivr.net', // Pyodide (and Jedi), so Python challenges run offline
  'pypi.org', // pyflakes for the editors' Python problem checks (lib/pythonLanguageClient.ts)
  'files.pythonhosted.org'
];

// Install: save every file of this build. One missing file must not block the
// update, so each is cached on its own; a gap is filled the next time it loads.
// Files under /assets/ have a content hash in their name, so one the previous build
// already saved is copied over instead of downloaded again.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const urls = Array.from(new Set([...PRECACHE_ASSETS, ...PRECACHE_MANIFEST]));
      return Promise.all(urls.map(async url => {
        try {
          if (url.startsWith('/assets/')) {
            const saved = await caches.match(url, MATCH);
            if (saved) return cache.put(url, saved);
          }
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch {
          // filled in the next time the file loads
        }
      }));
    })
  );
  self.skipWaiting();
});

// Activate: delete other builds' caches, then tell open pages a new version is ready.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => (KEEP.includes(key) ? undefined : caches.delete(key)))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' })))
  );
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

  // 1. Pages: network first. A fresh page also replaces the saved /index.html, so
  //    offline always opens the newest page rather than the one from first install.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
          }
          return resp;
        })
        .catch(async () => (await caches.match('/index.html', MATCH)) || Response.error())
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
      caches.open(CDN_CACHE_NAME).then(cache => {
        return cache.match(req, MATCH).then(cachedResponse => {
          const fetchPromise = fetch(req).then(networkResponse => {
            // Scripts a worker pulls in with importScripts (pyodide.js, pyodide.asm.js)
            // come back opaque; keep those too or the Python runtime can't start offline.
            if (networkResponse.ok || networkResponse.type === 'opaque') {
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

  // 4. Everything else (this build's files): cache first, saving anything new.
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req, MATCH).then(cached => {
      return cached || fetch(req).then(networkResponse => {
        if (networkResponse.ok && url.origin === self.location.origin) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      });
    })
  );
});

// Listen for commands from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // WARM_URLS: save these files now (e.g. the Python runtime) so they work offline
  // later even if the page never requested them while online. Already-cached files
  // are left alone; failures are ignored and retried on the next visit.
  if (event.data && event.data.type === 'WARM_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(CDN_CACHE_NAME).then(cache =>
        Promise.all(event.data.urls.map(url =>
          cache.match(url, MATCH).then(hit => hit || fetch(url).then(resp => {
            if (resp.ok) return cache.put(url, resp);
          })).catch(() => undefined)
        ))
      )
    );
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
