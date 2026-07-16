/**
 * ========================================================
 * ZettBOT 2.1 - PWA SERVICE WORKER (sw.js)
 * Koperasi PANEN - Penanganan Caching Shell dan Offline Fallback
 * ========================================================
 */

// 🟢 ZETTBOS FIX: Cache version dinaikkan ke v2.5 (Force Reset Cache)
const CACHE_NAME = 'panen-pwa-cache-v2.5';

// 1. Zettbos Protocol: Hanya cache file inti lokal saat Install untuk menghindari Crash CORS
const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'sw.js'
];

// Tahap INSTALL: Menyimpan aset statis lokal ke dalam Cache storage browser
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Zettbos SW] Pre-loading core local assets (Final Version)...');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Tahap ACTIVATE: Membersihkan cache versi lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Zettbos SW] Clearing old cache: ', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Tahap FETCH: Offline-first dan Zettbos Dynamic Caching untuk aset eksternal
self.addEventListener('fetch', event => {
  // Hanya proses metode GET pada protokol HTTP/HTTPS
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const requestUrl = new URL(event.request.url);

  // 🟢 ZETTBOS CRITICAL FIX: Bypass Cache untuk Google Apps Script & Google User Content
  if (requestUrl.hostname.includes('script.google.com') ||
      requestUrl.hostname.includes('script.googleusercontent.com') ||
      requestUrl.hostname.includes('googleusercontent.com') ||
      requestUrl.hostname.includes('drive.google.com')) {
      return; // Kembalikan kontrol langsung ke browser (Bypass Service Worker)
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(error => {
          console.warn('[Zettbos SW] Fetch failed, device might be offline.', error);
        });
      })
  );
});
