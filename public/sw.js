// Service Worker for PWA App Shell
const CACHE_NAME = 'flatmate-expenses-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/api.js',
  '/js/app.js',
  '/js/pages/dashboard.js',
  '/js/pages/personal.js',
  '/js/pages/common.js',
  '/js/pages/purchases.js',
  '/js/pages/balances.js',
  '/js/pages/repayments.js',
  '/js/pages/activity.js',
  '/js/pages/profile.js',
  '/js/pages/members.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Non-fatal cache prefetch warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass all API and dynamic requests straight through to network
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
