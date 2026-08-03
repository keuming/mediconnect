/* MediConnect RDV — Service Worker
   Strategie : Cache-first pour assets statiques, Network-only pour API */

const CACHE_NAME = 'mediconnect-rdv-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ne jamais intercepter les requetes API ou externes (backend,
  // Google Maps, Cloudinary...) -- une reponse en cache pour une
  // recherche d'etablissement ou une prise de RDV serait fausse des
  // qu'elle date de plus de quelques secondes.
  if (
    request.url.includes('/api/') ||
    request.url.includes('vercel.app') ||
    request.url.includes('googleapis.com') ||
    request.url.includes('gstatic.com') ||
    url.origin !== self.location.origin ||
    request.method !== 'GET'
  ) {
    return;
  }

  // 2. Navigation (HTML) -> Network-first, repli sur /index.html en cache
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

  // 3. Assets statiques (JS, CSS, images, fonts) -> Cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/)) {
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

  // 4. Tout le reste -> Network-only (pas d'interference)
});
