const CACHE_NAME = 'smart-energy-monitor-v2.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.png',
  '/apple-touch-icon.png'
];

// 1. Install event: Pre-cache essential assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-blocking note:', err);
      });
    })
  );
});

// 2. Activate event: Clear old caches and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Background Notifications and Messages from Client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon, badge, vibrate } = event.data;
    self.registration.showNotification(title || 'Smart Énergie Monitor', {
      body: body || 'Surveillance réseau électrique active',
      tag: tag || 'incident-alert',
      icon: icon || '/icon-192.png',
      badge: badge || '/notification-icon.png',
      vibrate: vibrate || [300, 100, 300, 100, 300],
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: { url: '/' },
    });
  }
});

// 4. Notification Click Handler - Focus or Open Window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// 5. Fetch event: Stale-While-Revalidate for app assets, bypass for ESP32/API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass caching completely for real-time ESP32 & local backend APIs
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ping') ||
    url.pathname.startsWith('/data') ||
    url.pathname.startsWith('/relais') ||
    url.pathname.startsWith('/auto') ||
    url.pathname.startsWith('/calibrer') ||
    url.pathname.startsWith('/settings') ||
    url.pathname.startsWith('/update') ||
    url.hostname === '192.168.4.1'
  ) {
    return;
  }

  // Handle SPA navigation requests offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Cache-First with Background Revalidation for static scripts & assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Asynchronously refresh in background if network is available
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/index.html') || caches.match('/');
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
