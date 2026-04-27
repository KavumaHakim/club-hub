const CACHE_NAME = 'ict-club-hub-v14';
const DATA_CACHE_NAME = 'ict-club-data-v14';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/styles.css'
];

const CDN_DOMAINS = [
  'aistudiocdn.com',
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'api.dicebear.com',
  'cdn.jsdelivr.net'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) return caches.delete(key);
      })))
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore unsupported request schemes such as chrome-extension:, moz-extension:, devtools:, etc.
  // The Cache API only supports http/https requests.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (req.method !== 'GET') {
    event.respondWith(fetch(req).catch(() => offlineJsonResponse()));
    return;
  }

  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
    event.respondWith(fetch(req).catch(() => new Response('', { status: 503, statusText: 'Offline' })));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  if (isSupabaseAuthRequest(url, req)) {
    event.respondWith(fetch(req).catch(() => offlineJsonResponse()));
    return;
  }

  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(req, DATA_CACHE_NAME));
    return;
  }

  if (CDN_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(staleWhileRevalidate(req, CACHE_NAME));
    return;
  }

  event.respondWith(cacheFirst(req, CACHE_NAME));
});

function isSupabaseAuthRequest(url, req) {
  return url.hostname.includes('supabase.co') && (
    url.pathname.includes('/auth') ||
    url.pathname.includes('/token') ||
    url.pathname.includes('/user') ||
    url.pathname.includes('/logout') ||
    req.headers.get('authorization')
  );
}

function canCache(req, resp) {
  const url = new URL(req.url);
  return req.method === 'GET' &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    resp &&
    resp.ok &&
    resp.type !== 'opaque';
}

async function safeCachePut(cache, req, resp) {
  try {
    if (canCache(req, resp)) await cache.put(req, resp.clone());
  } catch (error) {
    console.warn('Skipping cache put:', error);
  }
}

async function networkFirstNavigation(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(req);
    if (resp.ok) await cache.put('/index.html', resp.clone());
    return resp;
  } catch {
    return await cache.match('/index.html') || new Response('ClubHub is offline', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    await safeCachePut(cache, req, resp);
    return resp;
  } catch {
    return await cache.match(req) || offlineJsonResponse();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    await safeCachePut(cache, req, resp);
    return resp;
  } catch {
    return offlineAssetResponse(req);
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then(async resp => {
      await safeCachePut(cache, req, resp);
      return resp;
    })
    .catch(() => null);
  return cached || await networkPromise || offlineAssetResponse(req);
}

function offlineAssetResponse(req) {
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/html')) return caches.match('/index.html');
  if (accept.includes('application/json')) return offlineJsonResponse();
  return new Response('', { status: 503, statusText: 'Offline' });
}

function offlineJsonResponse() {
  return new Response(JSON.stringify({ offline: true, message: 'ClubHub is offline.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: 'ClubHub', body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'ClubHub', {
    body: data.body || '',
    icon: '/favicon.svg',
    data: { url: data.url || '/' }
  }));
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
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
