// ScanTrak service worker — caches the app shell so the app opens offline.
// It deliberately NEVER caches API traffic: attendance must always be live,
// and the API runs on a different origin (so the cross-origin guard skips it).
const CACHE = "scantrak-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

// API path prefixes to never cache, in case the API is ever served same-origin.
const API_PREFIXES = ["/auth", "/attendance", "/sessions", "/courses", "/reports"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Leave anything that isn't our own origin alone (the API, Google Fonts, etc.).
  if (url.origin !== self.location.origin) return;
  // Extra safety: never cache API routes even if same-origin in production.
  if (API_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // App navigations: network-first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // Static assets (JS/CSS/images): serve from cache first, then network.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
    )
  );
});
