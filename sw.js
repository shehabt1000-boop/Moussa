const CACHE_NAME = 'souq-v12-optimized';
const ASSETS = [
    '/',
    'index.html', // تأكد من أن اسم ملفك الرئيسي هو index.html
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

// التثبيت (Install)
self.addEventListener('install', (event) => {
    self.skipWaiting(); // تفعيل التحديث فوراً
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// التفعيل (Activate) - تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// جلب البيانات (Fetch) - استراتيجية Network First للمحتوى الديناميكي
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // تجاهل طلبات Firebase و Cloudinary من الكاش لتجنب مشاكل البيانات القديمة
    if (url.hostname.includes('firebase') || url.hostname.includes('cloudinary') || url.hostname.includes('googleapis')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // إذا وجد في الكاش، ارجعه، لكن قم بتحديثه في الخلفية (Stale-while-revalidate)
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // إذا فشل الاتصال بالإنترنت
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
