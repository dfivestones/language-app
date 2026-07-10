const CACHE = 'langapp-v1';
const ASSETS = [
  '/language-app/',
  '/language-app/index.html',
  '/language-app/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase / Anthropic API는 항상 네트워크에서
  if (e.request.url.includes('firebase') || e.request.url.includes('anthropic')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/language-app/'));
    })
  );
});

// 푸시 알림 (Web Push)
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: '📚 오늘 복습할 표현이 있어요!', body: '언어 앱을 열어 확인해보세요.' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/language-app/manifest.json',
      badge: '/language-app/manifest.json',
      tag: 'review-reminder',
      renotify: true,
      actions: [{ action: 'open', title: '복습 시작' }]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/language-app/'));
});
