// AURA Service Worker - Push Notifications & Offline Support

const CACHE_NAME = 'aura-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/thumbnail.png',
                '/offline.html'
            ]).catch(err => console.log('Cache addAll failed:', err));
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip WebSocket requests
    if (event.request.url.includes('/ws')) return;
    
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request).then((response) => {
                    if (response) return response;
                    
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    let data = {
        title: 'AURA',
        body: 'Something is happening in the cosmos...',
        icon: '/thumbnail.png',
        badge: '/thumbnail.png',
        tag: 'aura-notification',
        data: { url: '/' }
    };
    
    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/thumbnail.png',
        badge: data.badge || '/thumbnail.png',
        tag: data.tag || 'aura-notification',
        vibrate: [100, 50, 100],
        data: data.data || { url: '/' },
        actions: [
            { action: 'open', title: 'Enter Cosmos' },
            { action: 'dismiss', title: 'Later' }
        ],
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync for when user comes back online
self.addEventListener('sync', (event) => {
    if (event.tag === 'aura-sync') {
        event.waitUntil(
            // Could sync pending messages, etc.
            Promise.resolve()
        );
    }
});
