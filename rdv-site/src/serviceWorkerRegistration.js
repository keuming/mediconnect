// Enregistrement du service worker -- uniquement en production, pour ne
// jamais mettre en cache pendant le developpement local (npm start).

export function register() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        console.error('Echec de l\'enregistrement du service worker :', err);
      });
  });
}

export function unregister() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch(() => {});
}
