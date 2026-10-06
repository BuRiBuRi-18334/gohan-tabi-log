// ===== 電波がなくても開けるようにする係（サービスワーカー） =====
// アプリのファイルをスマホの中にしまっておいて、電波がないときはそれを使います。

const CACHE_NAME = 'gohan-log-v1';
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './cities.js',
  './japan.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './lib/leaflet.js',
  './lib/leaflet.css',
  './lib/leaflet.markercluster.js',
  './lib/MarkerCluster.css',
];

// 初めて開いたときに、アプリのファイルを全部しまっておく
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

// ファイルが必要になったら、まずインターネットから取ってくる（しまってある分も新しくする）。
// 電波がなくて取れなければ、しまっておいたものを使う
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
