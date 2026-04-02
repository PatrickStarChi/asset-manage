const CACHE_NAME = 'asset-manager-v1';
const STATIC_ASSETS = [
  '/mobile',
  '/mobile-style.css',
  '/mobile-app.js',
  '/manifest.json'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活 Service Worker
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
    }).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  // 只缓存 GET 请求和移动端页面
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // API 请求使用网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 网络失败时返回离线提示
          return new Response(JSON.stringify({ error: '离线状态，请检查网络连接' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // 静态资源使用缓存优先
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // 不缓存非 200 响应
          if (response.status !== 200) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
      .catch(() => {
        // 离线时返回缓存的移动页面
        if (url.pathname === '/mobile' || url.pathname.endsWith('mobile.html')) {
          return caches.match('/mobile');
        }
      })
  );
});
