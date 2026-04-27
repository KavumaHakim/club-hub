// ======================================================
// ICT Club Hub / ClubHub Service Worker
// Vite React compatible
// Offline app shell + CDN caching + safe Supabase handling
// Push notifications + update control
// ======================================================

const CACHE_VERSION = "v13";

const CACHE_NAMES = {
  app: `ict-club-hub-${CACHE_VERSION}`,
  data: `ict-club-data-${CACHE_VERSION}`,
  fonts: `ict-club-fonts-${CACHE_VERSION}`,
  images: `ict-club-images-${CACHE_VERSION}`,
  cdn: `ict-club-cdn-${CACHE_VERSION}`,
};

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/styles.css",
];

const JS_CSS_EXT = /\.(js|css|mjs|map)$/i;
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i;
const FONT_EXT = /\.(woff2?|ttf|otf|eot)$/i;

const STATIC_PREFIXES = [
  "/assets/",
  "/static/js/",
  "/static/css/",
  "/static/media/",
];

const CDN_DOMAINS = [
  "aistudiocdn.com",
  "esm.sh",
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "api.dicebear.com",
  "cdn.jsdelivr.net",
];

// ======================================================
// INSTALL
// ======================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAMES.app)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((error) => {
        console.error("[ClubHub SW] Precache failed:", error);
      })
  );
});

// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const allowedCaches = Object.values(CACHE_NAMES);
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys.map((key) => {
          if (!allowedCaches.includes(key)) {
            return caches.delete(key);
          }
          return null;
        })
      );

      await self.clients.claim();
      await notifyClientsOfUpdate();
    })()
  );
});

async function notifyClientsOfUpdate() {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    client.postMessage({ type: "SW_UPDATED" });
  }
}

// ======================================================
// FETCH
// ======================================================

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (!shouldHandleRequest(request)) return;

  const url = new URL(request.url);

  if (url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt") {
    event.respondWith(fetch(request));
    return;
  }

  if (isSupabaseAuthRequest(url, request)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isSupabaseRequest(url)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.data));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCdnRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.cdn));
    return;
  }

  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.fonts));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.app));
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.images));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.app));
});

// ======================================================
// HELPERS
// ======================================================

function shouldHandleRequest(request) {
  const url = new URL(request.url);

  if (request.method !== "GET") return false;
  if (!url.protocol.startsWith("http")) return false;
  if (url.protocol === "chrome-extension:") return false;

  return true;
}

function isSupabaseRequest(url) {
  return url.hostname.includes("supabase.co");
}

function isSupabaseAuthRequest(url, request) {
  const hasAuthHeader = request.headers.has("authorization");

  return (
    isSupabaseRequest(url) &&
    (
      url.pathname.includes("/auth") ||
      url.pathname.includes("/token") ||
      url.pathname.includes("/logout") ||
      url.pathname.includes("/user") ||
      hasAuthHeader
    )
  );
}

function isCdnRequest(url) {
  return CDN_DOMAINS.some((domain) => url.hostname.includes(domain));
}

function isFontRequest(url) {
  return (
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com") ||
    FONT_EXT.test(url.pathname)
  );
}

function isStaticAsset(url) {
  return (
    JS_CSS_EXT.test(url.pathname) ||
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function isImageRequest(url) {
  return IMAGE_EXT.test(url.pathname);
}

// ======================================================
// STRATEGIES
// ======================================================

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAMES.app);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put("/index.html", response.clone());
    }

    return response;
  } catch {
    const cachedIndex = await cache.match("/index.html");

    if (cachedIndex) return cachedIndex;

    return new Response(
      `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ClubHub Offline</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #111827;
              color: #f9fafb;
              display: grid;
              place-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 24px;
            }
            .card {
              max-width: 520px;
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 20px;
              padding: 28px;
              background: rgba(255,255,255,0.06);
              box-shadow: 0 20px 80px rgba(0,0,0,0.35);
            }
            h1 { margin-top: 0; }
            p { line-height: 1.6; color: #d1d5db; }
          </style>
        </head>
        <body>
          <main class="card">
            <h1>ClubHub is offline</h1>
            <p>
              The app shell has not been fully saved on this device yet.
              Open ClubHub once with internet, then it will be available offline.
            </p>
          </main>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (shouldCacheResponse(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) return cachedResponse;

    return offlineJsonResponse();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);

  if (shouldCacheResponse(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (shouldCacheResponse(response)) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return cachedResponse || networkPromise || offlineJsonResponse();
}

function shouldCacheResponse(response) {
  if (!response) return false;
  if (!response.ok) return false;
  if (response.type === "opaque") return false;

  return true;
}

function offlineJsonResponse() {
  return new Response(
    JSON.stringify({
      offline: true,
      message: "ClubHub is offline. Cached data may be unavailable for this request.",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// ======================================================
// UPDATE CONTROL
// ======================================================

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(clearAllClubHubCaches());
  }
});

async function clearAllClubHubCaches() {
  const keys = await caches.keys();

  await Promise.all(
    keys.map((key) => {
      if (key.startsWith("ict-club-") || key.startsWith("clubhub-")) {
        return caches.delete(key);
      }

      return null;
    })
  );
}

// ======================================================
// PUSH NOTIFICATIONS
// ======================================================

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "ClubHub",
      body: event.data?.text() || "You have a new ClubHub update.",
    };
  }

  const title = data.title || "ClubHub";

  const options = {
    body: data.body || "You have a new ClubHub notification.",
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || "clubhub-notification",
    renotify: Boolean(data.renotify),
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url: data.url || "/",
      type: data.type || "general",
      id: data.id || null,
      receivedAt: Date.now(),
    },
    actions: Array.isArray(data.actions) ? data.actions : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(openOrFocusClubHub(absoluteUrl));
});

async function openOrFocusClubHub(url) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    const clientUrl = new URL(client.url);

    if (clientUrl.origin === self.location.origin) {
      if ("navigate" in client) {
        await client.navigate(url);
      }

      if ("focus" in client) {
        return client.focus();
      }
    }
  }

  if (clients.openWindow) {
    return clients.openWindow(url);
  }

  return null;
}

// ======================================================
// BACKGROUND SYNC FOUNDATION
// ======================================================

self.addEventListener("sync", (event) => {
  if (event.tag === "clubhub-sync") {
    event.waitUntil(syncClubHubData());
  }
});

async function syncClubHubData() {
  // Later: connect this to IndexedDB offline queue.
  return Promise.resolve();
}