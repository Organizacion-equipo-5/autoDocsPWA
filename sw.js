/* autoDocs · Service Worker
   Para publicar una nueva versión: cambia VERSION (p. ej. 1.0.0 -> 1.1.0). */
const VERSION = '2.2.0';
const CACHE = 'autodocs-v' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/app.js',
  'js/config.js',
  'js/db.js',
  'js/landing.js', 
  'js/analyzer.js',
  'js/fx.js',
  'js/report.js',
  'js/zip.js',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
  // No se llama a skipWaiting() aquí: la app avisa y el usuario decide cuándo actualizar.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('autodocs-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navegación: devuelve el app shell guardado.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
    return;
  }

  // Recursos estáticos: caché primero, red como respaldo.
  event.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => new Response('', { status: 503, statusText: 'Sin conexión' }))
    )
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.tipo === 'SKIP_WAITING') self.skipWaiting();
  if (data.tipo === 'VERSION' && event.ports[0]) event.ports[0].postMessage(VERSION);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) return list[0].focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
