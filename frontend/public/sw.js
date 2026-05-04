/* MediConnect — Service Worker v2
   Stratégie : Cache-first pour assets statiques, Network-only pour API */

const CACHE_NAME = 'mediconnect-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install ───────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ne jamais intercepter les requêtes API ou externes
  if (
    request.url.includes('/api/') ||
    request.url.includes('vercel.app') ||
    request.url.includes('neon.tech') ||
    request.url.includes('mediconnect-fed6') ||
    request.url.includes('mediconnect-keumings') ||
    url.origin !== self.location.origin ||
    request.method !== 'GET'
  ) {
    // Laisser passer sans interception
    return;
  }

  // 2. Navigation (HTML) → Network-first, fallback sur /index.html caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // 3. Assets statiques (JS, CSS, images, fonts) → Cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.ok && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => new Response('Asset unavailable', { status: 503 }));
      })
    );
    return;
  }

  // 4. Tout le reste → Network-only (sans interférence SW)
  // Ne pas appeler event.respondWith() = le browser gère normalement
});
