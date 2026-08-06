/* Teknik Servis PWA — sadece offline/static; navigasyonu ASLA yakalama (iOS/Safari bozar) */
const CACHE = "ts-shell-v6";
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/admin-manifest.webmanifest",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Sayfa gezintisi ve Next.js chunk'ları — dokunma (Safari "couldn't load" önlemi)
  if (req.mode === "navigate") return;
  if (url.pathname.startsWith("/_next/")) return;
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splashes/") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname === "/favicon.png" ||
    url.pathname === "/offline.html" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/brand-logo.png"
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
