/**
 * service-worker.js
 * 
 * This service worker handles caching for offline access (PWA functionality)
 * and schedules notifications for completed events.
 */

const CACHE_NAME = 'nextup-cache-v1';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap'
];

// --- Caching (PWA) ---

// On install, cache the app shell.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_URLS))
    );
});

// On fetch, serve from cache first.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// --- Notifications ---
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SCHEDULE') {
        const { event: countdownEvent } = event.data;
        const targetDate = new Date(countdownEvent.date);

        if (targetDate > new Date() && 'showTrigger' in Notification.prototype) {
            const trigger = new TimestampTrigger(targetDate.getTime());

            self.registration.showNotification(`Event Ended: ${countdownEvent.name}`, {
                body: 'Your countdown has finished!',
                tag: `event-id-${countdownEvent.id}`, // Use a tag to replace/cancel existing notifications for this event
                showTrigger: trigger,
                data: { url: self.location.origin } // URL to open on click
            });
        }
    } else if (event.data && event.data.type === 'CANCEL') {
        const { eventId } = event.data;
        self.registration.getNotifications({ tag: `event-id-${eventId}`, includeTriggered: true })
            .then(notifications => {
                notifications.forEach(notification => notification.close());
            });
    }
});

// Handle notification click: focus the app's tab or open a new one.
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            const urlToOpen = event.notification.data.url;
            const client = clientList.find(c => c.url === urlToOpen && 'focus' in c);
            return client ? client.focus() : clients.openWindow(urlToOpen);
        })
    );
});