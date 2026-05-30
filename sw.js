const CACHE_NAME = 'work-tracker-v5'; // A v5-ös verzió jelzi a böngészőnek, hogy frissíteni kell
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Telepítéskor elmentjük az új fájlokat
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Azonnal aktiválja az új Service Workert
});

// Aktiváláskor töröljük a régi gyorsítótárakat
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('Régi cache törlése:', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch esemény: először a cache, de utána frissíti a hátérben
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});