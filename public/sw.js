// Service Worker for Hanzi Movie Method PWA
// Provides offline capability by caching app shell and assets

const CACHE_NAME = "hmm-cache-v1";
const DB_CACHE_NAME = "hmm-db-cache-v1";

// Core app shell files to cache on install
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// Patterns that should be cached
const CACHEABLE_PATTERNS = [
  /\/_next\/static\/.*/, // Next.js static assets
  /\/icon.*\.(png|svg)$/, // Icons
  /\.woff2?$/, // Fonts
];

// Install event - cache app shell
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching app shell");
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log("[SW] Skip waiting");
        return self.skipWaiting();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DB_CACHE_NAME)
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => {
        console.log("[SW] Claiming clients");
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Handle database file specially - don't cache it in SW (it's cached in IndexedDB)
  if (url.pathname === "/hanzi_data.db") {
    event.respondWith(
      fetch(request).catch(() => {
        console.log("[SW] Database fetch failed, should be in IndexedDB");
        return new Response("Database should be loaded from IndexedDB", {
          status: 503,
        });
      }),
    );
    return;
  }

  // Handle API routes - try network first, fail gracefully offline
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.log("[SW] API request failed (offline):", url.pathname);
        // Return a JSON error response for offline API calls
        return new Response(
          JSON.stringify({
            error: "Offline",
            offline: true,
            message:
              "This feature requires an internet connection or uses the offline database.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
    return;
  }

  // Handle sql.js WASM file - cache it for offline use
  if (url.hostname === "sql.js.org" && url.pathname.includes(".wasm")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log("[SW] Serving WASM from cache");
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              console.log("[SW] Cached WASM file");
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // For navigation requests (HTML pages), use network-first strategy
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for offline use
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fall back to cached home page
            return caches.match("/");
          });
        }),
    );
    return;
  }

  // For other assets, use cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          })
          .catch(() => {
            /* Ignore network errors for background update */
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Check if we should cache this response
          const shouldCache =
            response.ok &&
            (url.pathname.startsWith("/_next/static/") ||
              CACHEABLE_PATTERNS.some((pattern) => pattern.test(url.pathname)));

          if (shouldCache) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.log("[SW] Fetch failed:", url.pathname, error);
          // Return a generic offline response for assets
          return new Response("Offline", { status: 503 });
        });
    }),
  );
});

// Handle messages from the client
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
