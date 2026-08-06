/* Teknik Servis PWA — HTML asla cache’lenmez (deploy sonrası sayfa hatasını önler) */
const CACHE = "ts-shell-v5";
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

function isApiOrAuth(url) {
  const p = url.pathname;
  return (
    p.startsWith("/api/") ||
    p.includes("auth.php") ||
    p.includes("ping.php")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isApiOrAuth(url)) return;

  // Next.js build dosyaları: her zaman ağ (eski chunk = "This page couldn't load")
  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  // Sayfa gezintisi: sadece ağ — HTML cache deploy sonrası bozar
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const offline = await caches.match("/offline.html");
        return offline || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // İkon / manifest: stale-while-revalidate
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
