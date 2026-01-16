// ============================
// Service Worker: sw.js (Auth-safe, React-optimized)
// ============================

const CACHE_VERSION = "v16";
const APP_CACHE = `ict-app-${CACHE_VERSION}`;
const DATA_CACHE = `ict-data-${CACHE_VERSION}`;
const FONT_CACHE = `ict-fonts-${CACHE_VERSION}`;

// ---- Precache (minimal & safe) ----
const PRECACHE = [
  "/index.html",
  "/manifest.json",
  "/favicon.svg"
];

// ---- File matchers ----
const JS_CSS_EXT = /\.(js|css|mjs|map)$/i;
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif|svg)$/i;
const FONT_EXT = /\.(woff2?|ttf|otf)$/i;
const STATIC_PREFIXES = ["/static/js/", "/static/css/", "/static/media/"];

// ============================
// INSTALL
// ============================
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
});

// ============================
// ACTIVATE
// ============================
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (![APP_CACHE, DATA_CACHE, FONT_CACHE].includes(k)) {
          return caches.delete(k);
        }
      })
    );
    await self.clients.claim();
  })());
});

// ============================
// FETCH
// ============================
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-http & non-GET
  if (!url.protocol.startsWith("http") || req.method !== "GET") return;

  // ----------------------------
  // 🚨 SUPABASE AUTH — NEVER CACHE
  // ----------------------------
  if (
    url.hostname.includes("supabase.co") &&
    (
      url.pathname.includes("/auth") ||
      url.pathname.includes("/token") ||
      req.headers.get("authorization")
    )
  ) {
    event.respondWith(fetch(req));
    return;
  }

  // ----------------------------
  // SUPABASE DATA (safe to cache)
  // ----------------------------
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirst(req, DATA_CACHE));
    return;
  }

  // ----------------------------
  // SPA NAVIGATION
  // ----------------------------
  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // ----------------------------
  // FONTS
  // ----------------------------
  if (
    url.hostname.includes("fonts.gstatic.com") ||
    FONT_EXT.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  // ----------------------------
  // JS / CSS (React build output)
  // ----------------------------
  if (
    JS_CSS_EXT.test(url.pathname) ||
    STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))
  ) {
    event.respondWith(cacheFirst(req, APP_CACHE));
    return;
  }

  // ----------------------------
  // IMAGES
  // ----------------------------
  if (IMAGE_EXT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, APP_CACHE));
    return;
  }

  // ----------------------------
  // DEFAULT
  // ----------------------------
  event.respondWith(staleWhileRevalidate(req, APP_CACHE));
});

// ============================
// STRATEGIES
// ============================

async function networkFirstNavigation(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put("/index.html", resp.clone());
    return resp;
  } catch {
    return cache.match("/index.html");
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

// ============================
// UPDATE CONTROL
// ============================
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
