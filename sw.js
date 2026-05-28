const CACHE_NAME = 'work-tracker-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Telepítéskor elmentjük a fájlokat a telefon gyorsítótárába
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Amikor a telefon kéri az oldalt, először a gyorsítótárból próbáljuk betölteni
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});