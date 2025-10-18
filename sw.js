// Basic service worker for offline caching and faster loads
const CACHE_NAME = "gta-sync-radio-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/css/base.css",
  "/css/carousel.css",
  "/css/modal.css",
  "/css/responsive.css",
  "/js/main.js",
  "/js/player.js",
  "/js/carousel.js",
  "/js/data/gtaiii-stations.js",
  "/js/data/gtavc-stations.js",
  "/js/data/gtasa-stations.js",
  "/img/placeholder.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
});

// Network-first for media, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  // For audio media: try network, fallback to cache
  if (
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".ogg") ||
    url.pathname.endsWith(".wav")
  ) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const respClone = resp.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, respClone));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For other GET requests: cache-first, fall back to network and cache it
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          const respClone = resp.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, respClone));
          return resp;
        })
        .catch(() => {
          if (url.pathname === "/" || url.pathname.endsWith("/index.html")) {
            return caches.match("/index.html");
          }
          return new Response("Offline", {
            status: 503,
            statusText: "Offline",
          });
        });
    })
  );
});
