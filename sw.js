/**
 * ========================================================
 * ZettBOT 2.1 - PWA SERVICE WORKER (sw.js)
 * Koperasi PANEN - Penanganan Caching Shell dan Offline Fallback
 * ========================================================
 */

// 🟢 ZETTBOS FIX: Cache version dinaikkan ke v2.4 (Perbaikan Bug Cache Iframe Google)
const CACHE_NAME = 'panen-pwa-cache-v2.4';

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
        console.log('[Zettbos SW] Pre-loading core local assets (New Theme)...');
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
  // JANGAN PERNAH menyimpan iframe Apps Script ke dalam cache karena memiliki token sesi kedaluwarsa.
  if (requestUrl.hostname.includes('script.google.com') ||
      requestUrl.hostname.includes('script.googleusercontent.com') ||
      requestUrl.hostname.includes('googleusercontent.com') ||
      requestUrl.hostname.includes('drive.google.com')) {
      return; // Kembalikan kontrol langsung ke browser (Bypass Service Worker)
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Kembalikan dari cache jika ada
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, ambil dari network (Dynamic Caching)
        return fetch(event.request).then(networkResponse => {
          // Validasi response: Pastikan response valid atau berupa "opaque" (untuk CORS block)
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          // Kloning response untuk disimpan ke cache (karena response stream hanya bisa dibaca 1x)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(error => {
          console.warn('[Zettbos SW] Fetch failed, device might be offline.', error);
          // Jika gagal mengambil dari network (offline), biarkan fallthrough ke halaman offline
        });
      })
  );
});
