// Service Worker for Aaradhya Tuition Management System
const CACHE_NAME = 'aaradhya-tuition-v1.0.0';
const STATIC_CACHE_NAME = 'aaradhya-static-v1.0.0';
const API_CACHE_NAME = 'aaradhya-api-v1.0.0';

// Cache static assets
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/dashboard',
    '/api/students',
    '/api/courses',
    '/api/health'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...');

    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                console.log('📋 Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            }),

            // Cache API responses
            caches.open(API_CACHE_NAME).then((cache) => {
                console.log('🔌 Preparing API cache...');
                return Promise.resolve();
            })
        ]).then(() => {
            console.log('✅ Service Worker installed successfully');
            return self.skipWaiting();
        })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== API_CACHE_NAME &&
                        cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(request));
        return;
    }

    // Handle static assets
    if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.split('/').pop()))) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Default: network first, then cache
    event.respondWith(
        fetch(request).catch(() => {
            return caches.match(request);
        })
    );
});

// API Request Handler - Network First with Cache Fallback
async function handleAPIRequest(request) {
    const url = new URL(request.url);

    try {
        // Try network first
        const networkResponse = await fetch(request.clone());

        if (networkResponse.ok) {
            // Cache successful GET requests
            if (request.method === 'GET') {
                const cache = await caches.open(API_CACHE_NAME);
                cache.put(request.clone(), networkResponse.clone());
            }
            return networkResponse;
        }

        throw new Error('Network response not ok');

    } catch (error) {
        console.log('🔌 Network failed, trying cache for:', url.pathname);

        // Fall back to cache for GET requests
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        // Return offline response for failed API calls
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Offline - Please check your connection',
                offline: true
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Static Request Handler - Cache First
async function handleStaticRequest(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('❌ Failed to fetch static asset:', request.url);
        throw error;
    }
}

// Navigation Request Handler - Cache First with Network Fallback
async function handleNavigationRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            return networkResponse;
        }
        throw new Error('Network response not ok');
    } catch (error) {
        // Return cached index.html for navigation requests
        const cachedResponse = await caches.match('/index.html');
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Aaradhya Classes - Offline</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .offline { color: #666; }
                </style>
            </head>
            <body>
                <div class="offline">
                    <h1>📚 Aaradhya Classes</h1>
                    <h2>You're Offline</h2>
                    <p>Please check your internet connection and try again.</p>
                    <button onclick="location.reload()">🔄 Retry</button>
                </div>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);

    if (event.tag === 'sync-offline-actions') {
        event.waitUntil(syncOfflineActions());
    }
});

async function syncOfflineActions() {
    // Implement offline action synchronization
    console.log('📤 Syncing offline actions...');

    // Here you would implement logic to sync any offline actions
    // like form submissions, data changes, etc.
}

// Push notification handler
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification from Aaradhya Classes',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Aaradhya Classes', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked');
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('🚀 Aaradhya Tuition Service Worker loaded');
