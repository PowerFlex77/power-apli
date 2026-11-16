// Service worker — BL Power Flex (fonctionne sans réseau)
// Incrémenter VERSION à chaque mise à jour de l'appli pour forcer le rafraîchissement du cache
const VERSION = 'v1';
const CACHE = 'blpf-' + VERSION;
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './libs/xlsx.full.min.js',
  './libs/jspdf.umd.min.js',
  './libs/supabase.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('blpf-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Jamais de cache pour Supabase (API + stockage photos) ni pour le géocodage
  if (url.hostname.endsWith('supabase.co') || url.hostname.includes('nominatim')) return;

  // Pages : réseau d'abord (nouvelle version dès qu'il y a du réseau), cache sinon
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Fichiers statiques (libs, icônes, polices) : cache d'abord
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && (url.origin === location.origin || url.hostname.includes('fonts.g'))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
