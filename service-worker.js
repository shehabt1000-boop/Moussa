importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 1. إعدادات Firebase (نفس الموجودة في الكود الخاص بك)
const firebaseConfig = {
    apiKey: "AIzaSyA5OiTcX95GBgiJoDHnY3y7N23o-j8hsQ8",
    authDomain: "services-cef84.firebaseapp.com",
    databaseURL: "https://services-cef84-default-rtdb.firebaseio.com",
    projectId: "services-cef84",
    storageBucket: "services-cef84.firebasestorage.app",
    messagingSenderId: "902396219187",
    appId: "1:902396219187:web:3ba084a724266afa8bb846"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 2. إعدادات التخزين المؤقت (Offline Support)
const CACHE_NAME = 'souq-wayak-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event (Cleanup)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch Event (Network First, fallback to Cache)
self.addEventListener('fetch', (event) => {
    // التعامل مع Share Target (POST requests)
    if (event.request.method === 'POST' && event.request.url.includes('share-target')) {
        event.respondWith(Response.redirect('/?shared=true'));
        return;
    }

    // استراتيجية التعامل مع الملفات
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // تخزين نسخة من الاستجابة الناجحة
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                // في حالة انقطاع النت، جلب من الكاش
                return caches.match(event.request).then((response) => {
                    if (response) return response;
                    // صفحة بديلة في حالة عدم وجود كاش (اختياري)
                    return new Response('<h1>أنت غير متصل بالإنترنت</h1>', {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                });
            })
    );
});

// 3. Push Notifications Handler (Firebase)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        data: { url: payload.data?.url || '/' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const url = event.notification.data.url;
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// 4. Background Sync (لضمان إرسال البيانات لاحقاً عند عودة النت)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(console.log("Background Syncing Orders..."));
    }
});

// 5. Periodic Sync (لتحديث المحتوى في الخلفية)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'get-latest-listings') {
        event.waitUntil(console.log("Fetching new listings in background..."));
    }
});