/* Caché ligera del shell para uso offline parcial (PWA / Play).
 * Al cambiar lógica o recursos críticos, sube la versión para vaciar cachés antiguas. */
const CACHE_NAME = 'hydro-cannabis-shell-v8';
const SHELL = [
  './',
  './index.html',
  './css/base.css',
  './css/components.css',
  './css/responsive.css',
  './js/data.js',
  './js/state.js',
  './js/navigation.js',
  './js/systemSizing.js',
  './js/strains.js',
  './js/nutrients.js',
  './js/systemProfiles.js',
  './js/strainTargets.js',
  './js/cultivo.js',
  './js/monitor.js',
  './js/trendCharts.js',
  './js/semanas.js',
  './js/home.js',
  './js/clima.js',
  './js/main.js',
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
