// ============================
// Service Worker: sw.js v15 (React + TypeScript Edition)
// ============================

const CACHE_VERSION = "v15";
const CACHE_NAME = `ict-react-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `ict-data-${CACHE_VERSION}`;
const FONT_CACHE = `ict-fonts-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg"
];

// Patterns for React build output
const STATIC_PREFIXES = ["/static/js/", "/static/css/", "/static/media/"];
const JS_CSS_EXT = /\.(?:js|css|mjs|map)$/i;
const IMAGE_EXT = /\.(?:png|jpg|jpeg|webp|gif|svg)$/i;
const FONT_EXT = /\.(?:woff2|woff|otf|ttf)$/i;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (![CACHE_NAME, DATA_CACHE_NAME, FONT_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({
        includeUncontrolled: true
      });
      for (const c of clients) {
        c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (!url.protocol.startsWith("http")) return;

  if (req.method !== "GET") {
    event.respondWith(fetch(req));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirstData(req));
    return;
  }

  if (url.hostname.includes("fonts.googleapis.com")) {
    event.respondWith(networkFirst(req, CACHE_NAME));
    return;
  }

  if (url.hostname.includes("fonts.gstatic.com") || FONT_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  if (
    JS_CSS_EXT.test(url.pathname) ||
    STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))
  ) {
    event.respondWith(cacheFirst(req, CACHE_NAME));
    return;
  }

  if (IMAGE_EXT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, CACHE_NAME));
    return;
  }

  event.respondWith(staleWhileRevalidate(req, CACHE_NAME));
});

// Strategies below

async function networkFirstNavigation(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      cache.put("/index.html", resp.clone());
    }
    return resp;
  } catch {
    return cache.match("/index.html");
  }
}

async function networkFirstData(req) {
  const cache = await caches.open(DATA_CACHE_NAME);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch {
    return cache.match(req);
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch {
    return cache.match(req);
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req).then((resp) => {
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  });
  return cached || network;
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
