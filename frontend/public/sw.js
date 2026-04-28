const CACHE_NAME = 'mediconnect-cache-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Gestion des requêtes (C'est ici que se trouve la correction)
self.addEventListener('fetch', (event) => {
  // CORRECTION : On ignore les schémas non-http (comme chrome-extension://)
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // On ne met en cache que les requêtes réussies
          if (fetchResponse.ok) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // Optionnel : renvoyer une page hors-ligne ici
    })
  );
});