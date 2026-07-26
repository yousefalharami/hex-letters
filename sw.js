const CACHE = 'hex-letters-v49';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './i18n.js',
  './board.js',
  './game.js',
  './tournament.js',
  './storage.js',
  './orientation.js',
  './pwa.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './vendor/capacitor.js',
  './vendor/capacitor-screen-orientation.js',
  './vendor/capacitor-status-bar.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
