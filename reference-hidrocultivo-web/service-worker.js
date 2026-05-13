/**
 * HidroCultivo — Service Worker ligero (PWA).
 * Precache: shell offline básico. APIs (Open-Meteo, etc.) siguen yendo a red.
 */
const CACHE_NAME = 'hidrocultivo-shell-v26';
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './css/main.css',
  './icons/splash-brand.svg',
  './icons/splash-brand-icon.png',
  './js/cultivos-db.js',
  './js/state-torre-logic.js',
  './js/ui-tabs.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[HidroCultivo SW] precache omitido:', url, err);
              return null;
            })
          )
        )
      )
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[HidroCultivo SW] install', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = req.url || '';
  // Evita errores de FetchEvent con esquemas no gestionables (chrome-extension:, data:, etc.)
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  // No interceptar llamadas a APIs externas (AEMET/Open-Meteo/met.no/etc.).
  // Así evitamos errores de respondWith y dejamos que el navegador gestione CORS/errores de red.
  const u = new URL(url);
  if (u.origin !== self.location.origin) return;

  // Documento: red primero; si falla (offline), sirve el shell cacheado
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto: red (sin estrategia agresiva — evita romper APIs y fuentes)
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || Response.error()))
  );
});
