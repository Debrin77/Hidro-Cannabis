/* Caché ligera del shell para uso offline parcial (PWA / Play).
 * Al cambiar lógica o recursos críticos, sube la versión para vaciar cachés antiguas. */
const CACHE_NAME = 'hydro-cannabis-shell-v5';
const SHELL = [
  './',
  './index.html',
  './css/base.css?v=6',
  './css/components.css?v=6',
  './css/responsive.css?v=6',
  './js/data.js?v=6',
  './js/state.js?v=6',
  './js/navigation.js?v=6',
  './js/systemSizing.js?v=6',
  './js/strains.js?v=6',
  './js/nutrients.js?v=6',
  './js/systemProfiles.js?v=6',
  './js/strainTargets.js?v=6',
  './js/cultivo.js?v=6',
  './js/monitor.js?v=6',
  './js/trendCharts.js?v=6',
  './js/semanas.js?v=6',
  './js/home.js?v=6',
  './js/clima.js?v=6',
  './js/main.js?v=6',
  './manifest.webmanifest',
  './assets/icons/cannabis-start.svg',
  './assets/icons/hydro-cannabis-logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* Red primero: así ves cambios al recargar; si falla la red, se usa caché (offline). */
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  );
});
